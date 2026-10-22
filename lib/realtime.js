/** Dependency-free real-time transport: Server-Sent Events for updates, POST for commands. */
const {randomUUID}=require('node:crypto');
const MAX_BODY=8_500_000;
class LiveSocket {
  constructor(id){this.id=id;this.data={};this.handlers=new Map();this.response=null;this.lastSeen=Date.now();this.disconnectTimer=null;}
  on(event,callback){this.handlers.set(event,callback);}
  emit(event,data){if(!this.response||this.response.destroyed)return;try{this.response.write(`data: ${JSON.stringify({event,payload:data})}\n\n`);}catch{}}
  join(){}
  leave(){}
  attach(res){clearTimeout(this.disconnectTimer);if(this.response&&!this.response.destroyed)this.response.end();this.response=res;this.lastSeen=Date.now();}
  detach(res){if(this.response!==res)return;this.response=null;const fn=this.handlers.get('disconnect');if(fn)fn();this.lastSeen=Date.now();}
}
class RealtimeServer {
  constructor(){this.sockets={sockets:new Map()};this.onConnection=null;}
  on(event,callback){if(event==='connection')this.onConnection=callback;}
  handle(req,res){
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/events'&&req.method==='GET'){
      const id=url.searchParams.get('session');if(!id||!/^[-\w]{15,100}$/.test(id)){res.writeHead(400);res.end('Invalid session');return true;}
      let socket=this.sockets.sockets.get(id);if(!socket){socket=new LiveSocket(id);this.sockets.sockets.set(id,socket);if(this.onConnection)this.onConnection(socket);}
      res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
      socket.attach(res);res.write(': Talismaker connected\n\n');const heartbeat=setInterval(()=>{if(!res.destroyed)res.write(': ping\n\n');},20000);
      req.on('close',()=>{clearInterval(heartbeat);socket.detach(res);});return true;
    }
    if(url.pathname==='/api/action'&&req.method==='POST'){
      let input='',size=0,tooLarge=false;req.on('data',chunk=>{size+=chunk.length;if(size>MAX_BODY){tooLarge=true;req.destroy();return;}input+=chunk;});
      req.on('end',()=>{if(tooLarge)return;const reply=(status,obj)=>{if(res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
        try{const message=JSON.parse(input);const socket=this.sockets.sockets.get(message.session);if(!socket||!socket.response)throw Error('Session disconnected. Reconnect and try again.');const fn=socket.handlers.get(message.event);if(!fn)throw Error('Unsupported action.');socket.lastSeen=Date.now();let sent=false;fn(message.payload||{},out=>{sent=true;reply(200,out)});if(!sent)reply(200,{ok:true});}catch(err){reply(400,{ok:false,error:err.message||'Invalid request.'});}
      });return true;
    }
    return false;
  }
}
module.exports={RealtimeServer};

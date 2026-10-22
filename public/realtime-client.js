/* Tiny EventSource / fetch adapter. Works on Chrome, Safari, Firefox and mobile browsers. */
(function(){
window.io=function(){
  const handlers=new Map(),session=(self.crypto?.randomUUID?.()||('session_'+Math.random().toString(36).slice(2)+Date.now()));
  let connected=false,hasRoom=false,lastRoomUpdate=0;
  const client={
    get connected(){return connected;},
    on(event,listener){if(!handlers.has(event))handlers.set(event,[]);handlers.get(event).push(listener);return this;},
    timeout(){return this;},
    emit(event,payload,ack){
      fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session,event,payload:payload||{}}),cache:'no-store'})
       .then(async res=>{let data=await res.json();if(data?.ok&&data.room){hasRoom=true;fire('room:state',data.room);}if(data?.ok&&event==='room:leave')hasRoom=false;if(typeof ack==='function')ack(null,data);})
       .catch(err=>{if(typeof ack==='function')ack(err,null);});
      return this;
    }
  };
  const fire=(event,payload)=>{if(event==='room:state'){hasRoom=true;lastRoomUpdate=Date.now();}for(const fn of handlers.get(event)||[])fn(payload);};
  const stream=new EventSource('/api/events?session='+encodeURIComponent(session));
  stream.onopen=()=>{connected=true;fire('connect');};
  stream.onmessage=message=>{try{const data=JSON.parse(message.data);fire(data.event,data.payload);}catch(err){console.warn('Invalid game update',err);}};
  stream.onerror=()=>{if(connected){connected=false;fire('disconnect');}};
  // Render/reverse proxies sometimes drop streamed events; poll as a reliable fallback.
  // Only poll while a room is active, so the world editor doesn't generate idle traffic.
  let pendingSync=false;
  setInterval(async()=>{if(!hasRoom||pendingSync||document.hidden||(connected&&Date.now()-lastRoomUpdate<15000))return;pendingSync=true;
    try{const r=await fetch('/api/state?session='+encodeURIComponent(session),{cache:'no-store'});
      if(r.ok&&r.status===200){const data=await r.json();if(data.room)fire('room:state',data.room);}
    }catch(_e){}finally{pendingSync=false;}
  },6500);
  return client;
};
})();

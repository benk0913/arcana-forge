/* Tiny EventSource / fetch adapter. Works on Chrome, Safari, Firefox and mobile browsers. */
(function(){
window.io=function(){
  const handlers=new Map(),session=(self.crypto?.randomUUID?.()||('session_'+Math.random().toString(36).slice(2)+Date.now()));
  let connected=false;
  const client={
    get connected(){return connected;},
    on(event,listener){if(!handlers.has(event))handlers.set(event,[]);handlers.get(event).push(listener);return this;},
    timeout(){return this;},
    emit(event,payload,ack){
      fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session,event,payload:payload||{}}),cache:'no-store'})
       .then(async res=>{let data=await res.json();if(typeof ack==='function')ack(null,data);})
       .catch(err=>{if(typeof ack==='function')ack(err,null);});
      return this;
    }
  };
  const fire=(event,payload)=>{for(const fn of handlers.get(event)||[])fn(payload);};
  const stream=new EventSource('/api/events?session='+encodeURIComponent(session));
  stream.onopen=()=>{connected=true;fire('connect');};
  stream.onmessage=message=>{try{const data=JSON.parse(message.data);fire(data.event,data.payload);}catch(err){console.warn('Invalid game update',err);}};
  stream.onerror=()=>{if(connected){connected=false;fire('disconnect');}};
  return client;
};
})();

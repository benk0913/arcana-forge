'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const crypto=require('node:crypto');
const {makeDefault}=require('../public/defaults');
const {normalizeWorld}=require('../lib/ai');
const port=34048;process.env.PORT=String(port);
const base=`http://127.0.0.1:${port}`;
function connect(){return new Promise((resolve,reject)=>{
  const session='bot_test_'+crypto.randomBytes(15).toString('hex');
  const req=http.get(`${base}/api/events?session=${session}`,res=>{res.once('data',()=>resolve({session,req,res}));});req.once('error',reject);
});}
async function action(s,event,payload={}){return (await fetch(base+'/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:s.session,event,payload})})).json();}
async function state(s){return (await(await fetch(base+'/api/state?session='+s.session)).json()).room;}
async function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
(async()=>{
 const {server}=require('../server');await new Promise(r=>server.listening?r():server.once('listening',r));
 const host=await connect(),guest=await connect();
 const world=makeDefault();world.cells.forEach(c=>c.actions=[{type:'message',text:'Bot stepped into a new place.'}]);
 let out=await action(host,'room:create',{name:'Test Human',scenario:world});assert.equal(out.ok,true,JSON.stringify(out));assert.equal(out.room.code,out.code,'Create ACK must include immediate room state');
 let r=await state(host);assert.equal(r.code,out.code);
 let added=await action(guest,'room:addBot');assert.equal(added.ok,false,'Guests cannot create bots');
 added=await action(host,'room:addBot',{name:'Bot Rival'});assert.equal(added.ok,true,JSON.stringify(added));
 r=await state(host);const bot=r.players.find(p=>p.bot);assert.ok(bot);assert.equal(bot.name,'Bot Rival');assert.equal(bot.online,true);
 added=await action(guest,'room:join',{code:out.code,name:'Friend'});assert.equal(added.ok,true);
 assert.equal(added.room.players.length,3);
 let denied=await action(guest,'room:removeBot',{botId:bot.id});assert.equal(denied.ok,false);
 const removed=await action(host,'room:removeBot',{botId:bot.id});assert.equal(removed.ok,true);
 await action(host,'room:addBot',{name:'Bot Rival'});
 r=await state(host);const newBot=r.players.find(p=>p.bot);assert.ok(newBot);
 let start=await action(host,'room:start');assert.equal(start.ok,true,JSON.stringify(start));
 let turn=await action(host,'turn:roll');assert.equal(turn.ok,true);
 r=await state(host);turn=await action(host,'turn:move',{cellId:r.game.moves[0]});assert.equal(turn.ok,true);
 turn=await action(host,'turn:end');assert.equal(turn.ok,true);
 // Guest is next, followed by the bot. Perform guest's turn then observe automated moves.
 turn=await action(guest,'turn:roll');assert.equal(turn.ok,true);
 r=await state(guest);turn=await action(guest,'turn:move',{cellId:r.game.moves[0]});assert.equal(turn.ok,true);
 turn=await action(guest,'turn:end');assert.equal(turn.ok,true);
 r=await state(host);assert.equal(r.players[r.game.turnIndex].id,newBot.id);
 await sleep(3700);
 r=await state(host);assert.equal(r.game.turnIndex,0,'Bot should roll, move and finish without a client');
 assert.ok(r.log.some(x=>/Bot Rival rolled/.test(x.text)));
 assert.ok(r.log.some(x=>/Bot Rival traveled/.test(x.text)));
 const fake={...world,title:'AI test',layers:world.layers,cells:world.cells,characters:world.characters,decks:world.decks,rules:world.rules};
 const normalized=normalizeWorld(fake,null,'create');assert.equal(normalized.title,'AI test');assert.ok(normalized.cells.some(c=>c.actions.some(a=>a.type==='victory')));
 const blocked=await fetch(base+'/api/ai/world',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'make a world'})});assert.notEqual(blocked.status,200,'AI endpoints are locked until configured');
 // Exercise the complete provider adapter with synthetic model results (no API charges).
 process.env.AI_ADMIN_PASSWORD='testing-secret-123';process.env.GEMINI_API_KEY='not-a-real-key';
 const nativeFetch=global.fetch;let providerCalls=0;
 global.fetch=async(url,options)=>{
   if(String(url).startsWith('https://generativelanguage.googleapis.com/')){
     providerCalls++;
     const imageRequest=String(url).includes('flash-image');
     const parts=imageRequest?[{inlineData:{mimeType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/ld0AAAAASUVORK5CYII='}}]:[{text:JSON.stringify({...world,title:'AI Forest',cells:world.cells.slice(0,20),layers:world.layers.slice(0,2)})}];
     return new Response(JSON.stringify({candidates:[{content:{parts}}]}),{status:200,headers:{'Content-Type':'application/json'}});
   }
   return nativeFetch(url,options);
 };
 const aiHeaders={'Content-Type':'application/json','x-ai-password':'testing-secret-123'};
 const badPassword=await nativeFetch(base+'/api/ai/world',{method:'POST',headers:{...aiHeaders,'x-ai-password':'wrong'},body:JSON.stringify({prompt:'Create the whispering forest'})});assert.equal(badPassword.status,403);
 const generated=await(await nativeFetch(base+'/api/ai/world',{method:'POST',headers:aiHeaders,body:JSON.stringify({prompt:'Create the whispering forest'})})).json();assert.equal(generated.ok,true,JSON.stringify(generated));assert.equal(generated.world.title,'AI Forest');
 const imageResult=await(await nativeFetch(base+'/api/ai/image',{method:'POST',headers:aiHeaders,body:JSON.stringify({prompt:'Paint a mystical fortress on a floating island.',wide:true})})).json();
 assert.equal(imageResult.ok,true,JSON.stringify(imageResult));assert.match(imageResult.image,/^data:image\/png;base64,/);assert.equal(providerCalls,2);
 global.fetch=nativeFetch;

 console.log('✓ Create-room immediate state, auth, bots add/remove, automated full turns, AI world validation, secured AI text/image requests (mock provider), and automated bot turns passed.');
 for(const s of [host,guest]){s.res.destroy();s.req.destroy();}server.close();
})().catch(e=>{console.error(e);process.exit(1);});

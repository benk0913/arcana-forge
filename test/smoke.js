'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const {randomBytes}=require('node:crypto');
const {makeDefault}=require('../public/defaults');
const PORT=process.env.PORT||34047;process.env.PORT=String(PORT);const BASE=`http://127.0.0.1:${PORT}`;
const sessions=[];
function openSession(){return new Promise((resolve,reject)=>{
 const sid='test_'+randomBytes(16).toString('hex');const session={sid,state:null,events:[],req:null,res:null};
 const req=http.get(`${BASE}/api/events?session=${sid}`,res=>{session.res=res;let buf='';res.on('data',ch=>{buf+=ch.toString('utf8');const parts=buf.split('\n\n');buf=parts.pop();for(const block of parts){const line=block.split('\n').find(x=>x.startsWith('data: '));if(!line)continue;try{const event=JSON.parse(line.slice(6));session.events.push(event);if(event.event==='room:state')session.state=event.payload;}catch{}}});sessions.push(session);resolve(session);});
 req.on('error',reject);session.req=req;
 });}
async function act(session,event,payload={}){
 const res=await fetch(`${BASE}/api/action`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:session.sid,event,payload})});return await res.json();
}
function sleep(ms){return new Promise(res=>setTimeout(res,ms));}
(async()=>{
 const {server}=require('../server');await new Promise(res=>server.listening?res():server.once('listening',res));
 const health=await(await fetch(BASE+'/health')).json();assert.equal(health.ok,true);
 const home=await(await fetch(BASE+'/')).text();assert.match(home,/Talismaker/);
 const world=makeDefault();
 const host=await openSession(),guest=await openSession();
 let result=await act(host,'room:create',{scenario:world,name:'Host'});assert.equal(result.ok,true,JSON.stringify(result));
 const code=result.code,hostToken=result.token;assert.match(code,/^[A-F0-9]{6}$/);await sleep(20);
 assert.equal(host.state?.status,'lobby');assert.equal(host.state?.players.length,1);
 result=await act(guest,'room:join',{code,name:'Friend'});assert.equal(result.ok,true);await sleep(20);
 assert.equal(host.state.players.length,2);
 result=await act(guest,'room:start');assert.equal(result.ok,false,'Guests may not start the room');
 result=await act(guest,'room:character',{characterId:'hero_1'});assert.equal(result.ok,true);
 result=await act(host,'room:character',{characterId:'hero_0'});assert.equal(result.ok,true);
 result=await act(host,'room:start');assert.equal(result.ok,true);await sleep(20);
 assert.equal(host.state?.status,'playing');assert.equal(host.state.game.phase,'roll');
 result=await act(guest,'turn:roll');assert.equal(result.ok,false,'Only current player can roll');
 result=await act(host,'turn:roll');assert.equal(result.ok,true);await sleep(20);
 const g=host.state.game;assert.ok(g.die>=1&&g.die<=6);assert.ok(g.moves.length);
 result=await act(host,'turn:move',{cellId:'not_a_cell'});assert.equal(result.ok,false);
 result=await act(host,'turn:move',{cellId:g.moves[0]});assert.equal(result.ok,true);await sleep(20);
 if(host.state.game.phase==='encounter'){result=await act(host,'turn:fight');assert.equal(result.ok,true);await sleep(10);}
 assert.equal(host.state.game.phase,'end');
 result=await act(host,'turn:end');assert.equal(result.ok,true);await sleep(20);
 assert.equal(host.state.game.turnIndex,1);
 result=await act(guest,'turn:roll');assert.equal(result.ok,true);await sleep(20);
 result=await act(guest,'turn:move',{cellId:guest.state.game.moves[0]});assert.equal(result.ok,true);await sleep(20);
 if(guest.state.game.phase==='encounter'){result=await act(guest,'turn:fight');assert.equal(result.ok,true);await sleep(10);}
 result=await act(guest,'turn:end');assert.equal(result.ok,true);
 result=await act(guest,'room:updateScenario',{scenario:world});assert.equal(result.ok,false);
 result=await act(host,'room:chat',{text:'The game works!'});assert.equal(result.ok,true);await sleep(20);
 assert.equal(guest.state.chat.at(-1).text,'The game works!');
 result=await act(host,'room:restart');assert.equal(result.ok,true);await sleep(20);assert.equal(host.state.status,'lobby');
 result=await act(host,'room:updateScenario',{scenario:makeDefault()});assert.equal(result.ok,false,'Worlds stay frozen even in the lobby');
 const restored=await openSession();result=await act(restored,'room:join',{code,token:hostToken});assert.equal(result.ok,true);await sleep(20);assert.equal(restored.state.youId,host.state.hostId);
 const shopper=await openSession();
 const shopWorld=makeDefault();shopWorld.characters[0].gold=5;shopWorld.cells.forEach(c=>{c.actions=[{type:'shop',amount:2}];});
 let sh=await act(shopper,'room:create',{scenario:shopWorld,name:'Merchant Tester'});assert.equal(sh.ok,true);
 sh=await act(shopper,'room:start');assert.equal(sh.ok,true);
 sh=await act(shopper,'turn:roll');assert.equal(sh.ok,true);await sleep(20);
 const fateBefore=shopper.state.players[0].fate;
 sh=await act(shopper,'turn:fate');assert.equal(sh.ok,true);await sleep(20);
 assert.equal(shopper.state.players[0].fate,fateBefore-1);
 sh=await act(shopper,'turn:move',{cellId:shopper.state.game.moves[0]});assert.equal(sh.ok,true);await sleep(20);
 assert.equal(shopper.state.game.phase,'shop');
 sh=await act(shopper,'turn:shop',{buy:true});assert.equal(sh.ok,true);await sleep(20);
 assert.equal(shopper.state.players[0].items.length,1);
 assert.equal(shopper.state.players[0].gold,3);
 assert.equal(shopper.state.game.phase,'end');
 sh=await act(shopper,'room:restart');assert.equal(sh.ok,true);
 const choiceTester=await openSession();
 const choiceWorld=makeDefault();choiceWorld.cells.forEach(c=>{c.actions=[{type:'choice',amount:3}];});
 sh=await act(choiceTester,'room:create',{scenario:choiceWorld,name:'Choice Tester'});assert.equal(sh.ok,true);
 sh=await act(choiceTester,'room:start');assert.equal(sh.ok,true);
 sh=await act(choiceTester,'turn:roll');assert.equal(sh.ok,true);await sleep(20);
 sh=await act(choiceTester,'turn:move',{cellId:choiceTester.state.game.moves[0]});assert.equal(sh.ok,true);await sleep(20);
 assert.equal(choiceTester.state.game.phase,'choice');
 sh=await act(choiceTester,'turn:choice',{type:'gold'});assert.equal(sh.ok,true);await sleep(20);
 assert.equal(choiceTester.state.players[0].gold,4);
 const victoryTester=await openSession();
 const winningWorld=makeDefault();winningWorld.cells.forEach(c=>{c.actions=[{type:'victory',amount:1}];});
 sh=await act(victoryTester,'room:create',{scenario:winningWorld,name:'Victory Tester'});assert.equal(sh.ok,true);
 sh=await act(victoryTester,'room:start');assert.equal(sh.ok,true);
 sh=await act(victoryTester,'turn:roll');assert.equal(sh.ok,true);await sleep(20);
 sh=await act(victoryTester,'turn:move',{cellId:victoryTester.state.game.moves[0]});assert.equal(sh.ok,true);await sleep(20);
 assert.equal(victoryTester.state.status,'finished');
 console.log('✓ Static files, multiplayer rooms, permissions, movement, combat, Fate rerolls, shops, branching choices, victory, chat, frozen session worlds and reconnect passed.');
 for(const s of sessions){s.res?.destroy();s.req?.destroy();}
 server.close();
})().catch(err=>{console.error(err);for(const s of sessions){s.res?.destroy();s.req?.destroy();}process.exit(1);});

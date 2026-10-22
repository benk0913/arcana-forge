'use strict';
const http = require('http');
const {RealtimeServer} = require('./lib/realtime');
const {serve} = require('./lib/static');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {makeDefault} = require('./public/defaults');
const {handleAi} = require('./lib/ai');

const io=new RealtimeServer();
const server=http.createServer((req,res)=>{
 if(io.handle(req,res))return;
 if(handleAi(req,res))return;
 if(req.method==='GET'&&req.url?.split('?')[0]==='/api/state'){const session=new URL(req.url,'http://localhost').searchParams.get('session');const active=io.sockets.sockets.get(session);const pair=active&&playerFor(active);if(!pair){res.writeHead(204,{'Cache-Control':'no-store'});res.end();return;}res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({room:publicRoom(pair.room,pair.player.id)}));return;}
 if(req.url?.split('?')[0]==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,app:'Talismaker'}));return;}
 serve(req,res,path.join(__dirname,'public'));
});
const PORT=Number(process.env.PORT)||3000;
const DATA_FILE=path.join(__dirname,'data','rooms.json');
fs.mkdirSync(path.dirname(DATA_FILE),{recursive:true});
const rooms=new Map();
const botTimers=new Map();
try { const parsed=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); for(const r of parsed) if(r.code&&r.scenario&&r.players) {r.players.forEach(p=>{p.bot=!!p.bot;p.online=p.bot;});r.worldVersion ||= 1;rooms.set(r.code,r);} } catch(_e) { /* fresh installation */ }
let saveTimer;
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{const snapshot=[...rooms.values()];fs.writeFileSync(DATA_FILE+'.tmp',JSON.stringify(snapshot));fs.renameSync(DATA_FILE+'.tmp',DATA_FILE);}catch(err){console.error('Cannot save rooms:',err.message)}},250);}
const id=()=>crypto.randomBytes(10).toString('hex');
const code=()=>crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();
const rand=(n)=>crypto.randomInt(1,n+1);
const clean=(v,max=100)=>String(v??'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,max);
const num=(x,d=0)=>Number.isFinite(Number(x))?Math.max(-100,Math.min(100,Number(x))):d;
function validateScenario(s){
  if(!s||typeof s!=='object'||!Array.isArray(s.layers)||!Array.isArray(s.cells)||!Array.isArray(s.characters)||!s.decks||!s.rules)throw Error('Invalid world file.');
  if(s.layers.length<1||s.layers.length>12||s.cells.length<2||s.cells.length>160||s.characters.length<1||s.characters.length>40)throw Error('World exceeds the supported board limits.');
  for(const key of ['adventure','item','spell'])if(!Array.isArray(s.decks[key])||s.decks[key].length>150)throw Error('Invalid card decks.');
  if(JSON.stringify(s).length>7500000)throw Error('World too large. Reduce your uploaded artwork size.');
  // Parse into data-only object; ban prototype keys so scenario imports cannot pollute objects.
  return JSON.parse(JSON.stringify(s,(k,v)=>['__proto__','constructor','prototype'].includes(k)?undefined:v));
}
function current(room){return room.players[room.game?.turnIndex??0]}
function playerFor(socket){const room=rooms.get(socket.data.roomCode);return room?.players.find(x=>x.id===socket.data.playerId)?{room,player:room.players.find(x=>x.id===socket.data.playerId)}:null;}
function hostOnly(socket,room){if(room.hostId!==socket.data.playerId)throw Error('Only the host can do that.');}
function authTurn(socket,room,phase){if(room.status!=='playing'||current(room)?.id!==socket.data.playerId)throw Error('It is not your turn.');if(phase&&room.game.phase!==phase)throw Error('That action is not available right now.');return current(room);}
function nextTurn(room){room.game.turnIndex=(room.game.turnIndex+1)%room.players.length;if(room.game.turnIndex===0)room.game.round++;room.game.phase='roll';room.game.die=null;room.game.moves=[];room.game.encounter=null;room.game.lastCard=null;room.game.lastBattle=null;room.game.turnBuff=0;room.game.shop=null;room.game.choice=null;log(room,`It is ${current(room).name}'s turn.`);}
function publicRoom(room,viewer){return {code:room.code,createdAt:room.createdAt,hostId:room.hostId,status:room.status,scenario:room.scenario,players:room.players.map(p=>({
  id:p.id,name:p.name,online:p.online,bot:!!p.bot,characterId:p.characterId,health:p.health,strength:p.strength,craft:p.craft,fate:p.fate,gold:p.gold,position:p.position,items:p.items,spells:p.id===viewer?p.spells:[],spellCount:p.spells.length
})),game:room.game,log:room.log.slice(-75),chat:room.chat.slice(-70),youId:viewer};}
function emitRoom(room){for(const s of io.sockets.sockets.values())if(s.data.roomCode===room.code){const snapshot=publicRoom(room,s.data.playerId);const worldKey=room.code+':'+(room.worldVersion||1);if(s.data.lastWorldKey===worldKey)delete snapshot.scenario;else s.data.lastWorldKey=worldKey;s.emit('room:state',snapshot);}save();scheduleBot(room);}
function log(room,text){room.log.push({id:id(),time:Date.now(),text:clean(text,360)});if(room.log.length>160)room.log.shift();}
function character(room,p){return room.scenario.characters.find(c=>c.id===p.characterId)}
function starter(room){return room.scenario.cells.some(c=>c.id===room.scenario.rules.startCellId)?room.scenario.rules.startCellId:room.scenario.cells[0].id}
function neighbors(room,cellId){const cell=room.scenario.cells.find(c=>c.id===cellId);if(!cell)return [];
 const cs=room.scenario.cells.filter(c=>c.layerId===cell.layerId),i=cs.findIndex(c=>c.id===cellId),out=new Set();
 if(cs.length>1){out.add(cs[(i+1)%cs.length].id);out.add(cs[(i-1+cs.length)%cs.length].id);}
 for(const c of room.scenario.cells)if((c.links||[]).includes(cellId))out.add(c.id);
 for(const link of cell.links||[])out.add(link);
 return [...out].filter(x=>x!==cellId&&room.scenario.cells.some(c=>c.id===x));
}
function destinations(room,origin,distance){let frontier=new Set([origin]);for(let n=0;n<distance;n++){const next=new Set();for(const cell of frontier)for(const dest of neighbors(room,cell))next.add(dest);frontier=next;}return [...frontier].filter(x=>x!==origin);}
function shuffle(a){const c=[...a];for(let i=c.length-1;i>0;i--){const j=crypto.randomInt(i+1);[c[i],c[j]]=[c[j],c[i]];}return c;}
function draw(room,type){if(!room.game.piles[type]?.length)room.game.piles[type]=shuffle(room.scenario.decks[type].map(c=>c.id));const key=room.game.piles[type].pop();return room.scenario.decks[type].find(c=>c.id===key);}
function defeat(room,p){if(p.health>0)return;const lost=Math.ceil(p.gold*Math.max(0,Math.min(100,num(room.scenario.rules.respawnGoldLossPct,50)))/100);p.health=Math.max(1,num(character(room,p)?.health,4));p.gold-=lost;p.position=starter(room);log(room,`${p.name} was defeated, lost ${lost} gold, and returned to the starting space.`);}
function applyEffects(room,p,effects,depth=0){if(depth>8||room.status!=='playing')return;
 for(const effect of Array.isArray(effects)?effects:[]){if(room.game.encounter||room.game.shop||room.game.choice||room.status!=='playing')break;
  const type=clean(effect.type,40),amount=num(effect.amount,1),step=amount||1;
  if(type==='message'){if(effect.text)log(room,clean(effect.text,240));}
  else if(type==='gold'){p.gold=Math.max(0,p.gold+amount);log(room,`${p.name} ${amount>=0?'gained':'lost'} ${Math.abs(amount)} gold.`);}
  else if(type==='health'){p.health=Math.max(0,Math.min(20,p.health+amount));log(room,`${p.name} ${amount>=0?'recovered':'lost'} ${Math.abs(amount)} life.`);defeat(room,p);}
  else if(type==='strength'||type==='craft'||type==='fate'){p[type]=Math.max(0,Math.min(30,p[type]+amount));log(room,`${p.name} ${amount>=0?'gained':'lost'} ${Math.abs(amount)} ${type}.`);}
  else if(type==='draw_item'||type==='draw_spell'){for(let i=0;i<Math.min(5,Math.max(1,step));i++){const card=draw(room,type==='draw_item'?'item':'spell');if(!card)break;if(type==='draw_item')p.items.push(card.id);else p.spells.push(card.id);log(room,`${p.name} obtained ${card.name}.`);}}
  else if(type==='draw_adventure'){
   const card=draw(room,'adventure');if(!card){log(room,'The adventure deck is empty.');continue;}
   room.game.lastCard={id:card.id,name:card.name,icon:card.icon,type:card.type,description:card.description,image:card.image||''};
   log(room,`${p.name} drew ${card.name}.`);
   if(card.type==='enemy'){room.game.encounter={cardId:card.id};room.game.phase='encounter';break;}
   else applyEffects(room,p,card.effects||[],depth+1);
  }
  else if(type==='shop'){room.game.shop={cost:Math.max(1,Math.round(Math.abs(amount)||2))};room.game.phase='shop';log(room,`${p.name} enters a merchant's shop.`);break;}
  else if(type==='choice'){room.game.choice={amount:Math.max(1,Math.abs(amount)||1)};room.game.phase='choice';log(room,`${p.name} must choose a blessing: life or gold.`);break;}
  else if(type==='teleport'){const target=room.scenario.cells.find(c=>c.id===effect.targetId);p.position=target?.id||starter(room);log(room,`${p.name} was transported to ${target?.name||'the starting space'}.`);}
  else if(type==='victory'){room.status='finished';room.game.winnerId=p.id;room.game.phase='finished';log(room,`✦ ${p.name} has won the adventure!`);break;}
 }
}

function doRoll(room,p){
 room.game.die=rand(Math.max(2,Math.min(12,num(room.scenario.rules.diceSides,6))));room.game.moves=destinations(room,p.position,room.game.die);room.game.phase=room.game.moves.length?'move':'end';room.game.lastCard=null;room.game.lastBattle=null;log(room,`${p.name} rolled ${room.game.die}.`);if(!room.game.moves.length)log(room,'No destination is reachable.');
}
function doMove(room,p,destination){
 if(!room.game.moves.includes(destination))throw Error('That space is not a legal destination.');p.position=destination;if(p.bot){p.botHistory=Array.isArray(p.botHistory)?p.botHistory:[];p.botHistory.push(destination);p.botHistory=p.botHistory.slice(-5);}room.game.moves=[];room.game.phase='end';const cell=room.scenario.cells.find(c=>c.id===p.position);log(room,`${p.name} traveled to ${cell.name}.`);if(cell.description)log(room,cell.description);applyEffects(room,p,cell.actions||[]);
}
function doFight(room,p){
 const card=room.scenario.decks.adventure.find(c=>c.id===room.game.encounter?.cardId);if(!card)throw Error('The enemy no longer exists.');const useCraft=Number(card.craft)>0;const items=p.items.map(x=>room.scenario.decks.item.find(c=>c.id===x)).filter(Boolean);const bonus=items.reduce((s,x)=>s+num(x[useCraft?'bonusCraft':'bonusStrength']),0);
 const playerDie=rand(6),enemyDie=rand(6),playerTotal=(useCraft?p.craft:p.strength)+bonus+room.game.turnBuff+playerDie,enemyTotal=num(useCraft?card.craft:card.strength,3)+enemyDie;
 room.game.lastBattle={playerDie,enemyDie,playerTotal,enemyTotal,name:card.name,result:playerTotal>enemyTotal?'win':playerTotal===enemyTotal?'tie':'lose'};
 room.game.encounter=null;room.game.phase='end';room.game.turnBuff=0;
 if(playerTotal>enemyTotal){log(room,`${p.name} defeated ${card.name}! (${playerTotal} vs ${enemyTotal})`);applyEffects(room,p,card.effects||[]);}
 else if(playerTotal<enemyTotal){const damage=Math.max(1,Math.min(10,num(room.scenario.rules.enemyDamage,1)));p.health=Math.max(0,p.health-damage);log(room,`${card.name} defeated ${p.name}! (${enemyTotal} vs ${playerTotal}) — lose ${damage} life.`);defeat(room,p);}
 else log(room,`${p.name} and ${card.name} fought to a standstill (${playerTotal} each).`);
}
function doShop(room,p,buy){const cost=room.game.shop?.cost||2;room.game.shop=null;if(buy&&p.gold>=cost){p.gold-=cost;applyEffects(room,p,[{type:'draw_item',amount:1}]);}else log(room,`${p.name} left the shop without buying.`);room.game.phase='end';}
function doChoice(room,p,type){const amount=room.game.choice?.amount||1;room.game.choice=null;room.game.phase='end';applyEffects(room,p,[{type,amount}]);}
function botDestination(room,bot){
 const cells=room.scenario.cells,byId=new Map(cells.map(c=>[c.id,c]));const choices=room.game.moves||[];if(!choices.length)return null;
 const victories=cells.filter(c=>(c.actions||[]).some(a=>a.type==='victory'));
 function distance(from){if(!victories.length)return 0;const targets=new Set(victories.map(c=>c.id));if(targets.has(from))return 0;
   const visited=new Set([from]),queue=[[from,0]];
   for(let i=0;i<queue.length;i++){const [id,d]=queue[i];for(const next of neighbors(room,id)){if(visited.has(next))continue;if(targets.has(next))return d+1;visited.add(next);queue.push([next,d+1]);}}
   return 30;
 }
 const rank=c=>{const actions=c.actions||[];let score=30-distance(c.id)*3;
  for(const a of actions)score+=({victory:110,draw_item:16,draw_spell:12,gold:bot.gold<4?15:6,health:bot.health<3?25:4,draw_adventure:6,choice:8,shop:bot.gold>=3?11:1,craft:7,strength:7,fate:5,teleport:-5})[a.type]||0;
  const radius=Number(room.scenario.layers.find(l=>l.id===c.layerId)?.radius)||40;
  score+=(45-radius)*.22;
  if((bot.botHistory||[]).includes(c.id))score-=10;
  return score;
 };
 return [...choices].sort((a,b)=>rank(byId.get(b)||{actions:[],id:b})-rank(byId.get(a)||{actions:[],id:a}))[0];
}

function scheduleBot(room){if(botTimers.has(room.code)||room.status!=='playing'||!current(room)?.bot)return;
 const turnId=current(room).id,phase=room.game?.phase;
 const timer=setTimeout(()=>{botTimers.delete(room.code);if(room.status!=='playing'||current(room)?.id!==turnId||!current(room).bot||room.game?.phase!==phase)return;
   try{const bot=current(room);if(phase==='roll')doRoll(room,bot);
    else if(phase==='move')doMove(room,bot,botDestination(room,bot));
    else if(phase==='encounter')doFight(room,bot);
    else if(phase==='shop')doShop(room,bot,bot.gold>=(room.game.shop?.cost||2));
    else if(phase==='choice')doChoice(room,bot,bot.health<=2?'health':'gold');
    else if(phase==='end')nextTurn(room);
    emitRoom(room);
   }catch(e){console.warn('Bot turn recovery:',e.message);if(room.status==='playing'){nextTurn(room);emitRoom(room);}}
 },1000);
 botTimers.set(room.code,timer);
}

function joinRoom(socket,room,p){if(p.bot)throw Error('Bot slots cannot be claimed.');if(socket.data.roomCode&&socket.data.roomCode!==room.code)socket.leave(socket.data.roomCode);const wasAlreadyHere=socket.data.roomCode===room.code&&socket.data.playerId===p.id&&p.online;socket.data.roomCode=room.code;socket.data.playerId=p.id;p.online=true;socket.join(room.code);if(!wasAlreadyHere)log(room,`${p.name} joined the gathering.`);emitRoom(room);return {code:room.code,token:p.token,room:publicRoom(room,p.id)};}
function safeHandler(socket,event,fn){socket.on(event,(payload,ack)=>{try{const answer=fn(payload||{});if(typeof ack==='function')ack({ok:true,...(answer||{})});}catch(err){if(typeof ack==='function')ack({ok:false,error:err.message||'Something went wrong.'});}});}
io.on('connection',socket=>{
 safeHandler(socket,'room:create',payload=>{
   const scenario=validateScenario(payload.scenario||makeDefault());const nickname=clean(payload.name,26)||'Adventurer';let key=code();while(rooms.has(key))key=code();const player={id:id(),token:id()+id(),bot:false,name:nickname,online:false,characterId:null,health:0,strength:0,craft:0,fate:0,gold:0,position:null,items:[],spells:[]};const room={code:key,createdAt:Date.now(),hostId:player.id,status:'lobby',scenario,worldVersion:1,players:[player],game:null,log:[],chat:[]};rooms.set(key,room);return joinRoom(socket,room,player);
 });
 safeHandler(socket,'room:join',payload=>{
   const key=clean(payload.code,6).toUpperCase(),room=rooms.get(key);if(!room)throw Error('No adventure found for that room code.');
   let p=room.players.find(p=>!p.bot&&p.token===payload.token&&payload.token);
   if(!p){if(room.players.length>=Math.min(8,Math.max(1,num(room.scenario.rules.maxPlayers,6))))throw Error('That adventure is full.');p={id:id(),token:id()+id(),bot:false,name:clean(payload.name,26)||'Adventurer',online:false,characterId:null,health:0,strength:0,craft:0,fate:0,gold:0,position:null,items:[],spells:[]};room.players.push(p);}
   return joinRoom(socket,room,p);
 });
 safeHandler(socket,'room:leave',()=>{const pair=playerFor(socket);if(!pair)throw Error('Not in a room.');socket.leave(pair.room.code);pair.player.online=false;socket.data.roomCode=null;socket.data.playerId=null;emitRoom(pair.room);});
 safeHandler(socket,'room:character',payload=>{const {room,player}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');if(room.status!=='lobby')throw Error('Characters cannot be changed after starting.');const chosen=room.scenario.characters.find(c=>c.id===payload.characterId);if(!chosen)throw Error('Character not found.');if(room.players.some(p=>p.id!==player.id&&p.characterId===chosen.id))throw Error('That character is already chosen.');player.characterId=chosen.id;emitRoom(room);});
 safeHandler(socket,'room:updateScenario',payload=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');hostOnly(socket,room);if(room.status!=='lobby')throw Error('Worlds may only be edited in the lobby.');room.scenario=validateScenario(payload.scenario);room.worldVersion=(room.worldVersion||1)+1;room.players.forEach(p=>{if(!room.scenario.characters.some(c=>c.id===p.characterId))p.characterId=null;});log(room,'The host updated the adventure world.');emitRoom(room);});
 safeHandler(socket,'room:addBot',payload=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');hostOnly(socket,room);if(room.status!=='lobby')throw Error('Bots can only be added in the lobby.');if(room.players.length>=Math.min(8,Math.max(1,num(room.scenario.rules.maxPlayers,6))))throw Error('The player limit has been reached.');const chosen=room.scenario.characters.find(c=>!room.players.some(p=>p.characterId===c.id));if(!chosen)throw Error('Every character is taken. Add another hero in the World Builder.');const name=clean(payload.name,26)||`Bot ${room.players.filter(p=>p.bot).length+1}`;const p={id:id(),token:null,bot:true,name,online:true,characterId:chosen.id,health:0,strength:0,craft:0,fate:0,gold:0,position:null,items:[],spells:[]};room.players.push(p);log(room,`${name} (bot) joined the party.`);emitRoom(room);});
 safeHandler(socket,'room:removeBot',payload=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');hostOnly(socket,room);if(room.status!=='lobby')throw Error('Bots can only be removed in the lobby.');const bot=room.players.find(p=>p.id===payload.botId&&p.bot);if(!bot)throw Error('Bot not found.');room.players=room.players.filter(p=>p!==bot);log(room,`${bot.name} was removed.`);emitRoom(room);});
 safeHandler(socket,'room:sync',()=>{const pair=playerFor(socket);if(!pair)throw Error('You are not in a room.');return {room:publicRoom(pair.room,pair.player.id)};});
 safeHandler(socket,'room:start',()=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');hostOnly(socket,room);if(room.status!=='lobby')throw Error('The adventure has already started.');const taken=new Set();
   for(const p of room.players){if(!p.characterId)continue;if(taken.has(p.characterId))throw Error('Two players cannot use the same character.');taken.add(p.characterId);}
   for(const p of room.players){if(!p.characterId){const hero=room.scenario.characters.find(c=>!taken.has(c.id));if(!hero)throw Error('Add more characters or remove extra players before starting.');p.characterId=hero.id;taken.add(p.characterId);}const c=character(room,p);p.health=num(c.health,4);p.strength=num(c.strength,3);p.craft=num(c.craft,3);p.fate=num(c.fate,2);p.gold=num(c.gold,1);p.position=starter(room);p.items=[];p.spells=[];}
   room.status='playing';room.game={turnIndex:0,round:1,phase:'roll',die:null,moves:[],encounter:null,lastCard:null,lastBattle:null,turnBuff:0,shop:null,choice:null,piles:{adventure:[],item:[],spell:[]},winnerId:null};log(room,'The adventure begins!');log(room,`It is ${current(room).name}'s turn.`);emitRoom(room);
 });
 safeHandler(socket,'turn:roll',()=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');const p=authTurn(socket,room,'roll');doRoll(room,p);emitRoom(room);});
 safeHandler(socket,'turn:move',payload=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');const p=authTurn(socket,room,'move');doMove(room,p,payload.cellId);emitRoom(room);});
 safeHandler(socket,'turn:fight',()=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');const p=authTurn(socket,room,'encounter');doFight(room,p);emitRoom(room);});
 safeHandler(socket,'turn:spell',payload=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');const p=authTurn(socket,room);if(room.game.phase==='finished')throw Error('The adventure is over.');const ix=p.spells.indexOf(payload.cardId);if(ix<0)throw Error('You do not have that spell.');const spell=room.scenario.decks.spell.find(c=>c.id===payload.cardId);if(!spell)throw Error('Spell not found.');const amount=num(spell.amount,1);
   if(spell.type==='reroll'&&room.game.phase!=='move')throw Error('You can only reroll after a movement roll.');if(spell.type==='flee'&&room.game.phase!=='encounter')throw Error('You can only escape during an encounter.');
   p.spells.splice(ix,1);log(room,`${p.name} cast ${spell.name}.`);
   if(spell.type==='heal'){p.health=Math.min(20,p.health+Math.max(1,amount));}
   else if(spell.type==='gold'){p.gold=Math.max(0,p.gold+amount);}
   else if(spell.type==='power'){room.game.turnBuff+=amount;}
   else if(spell.type==='draw_spell'){applyEffects(room,p,[{type:'draw_spell',amount}]);}
   else if(spell.type==='reroll'){room.game.die=rand(Math.max(2,Math.min(12,num(room.scenario.rules.diceSides,6))));room.game.moves=destinations(room,p.position,room.game.die);room.game.phase=room.game.moves.length?'move':'end';log(room,`${p.name} rerolled a ${room.game.die}.`);}
   else if(spell.type==='teleport'){p.position=room.scenario.cells.some(c=>c.id===spell.targetId)?spell.targetId:starter(room);if(room.game.phase==='move'){room.game.moves=[];room.game.phase='end';}}
   else if(spell.type==='flee'){room.game.encounter=null;room.game.phase='end';log(room,`${p.name} escaped the encounter.`);}
   emitRoom(room);
 });
 safeHandler(socket,'turn:fate',()=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');const p=authTurn(socket,room,'move');if(p.fate<=0)throw Error('You have no Fate left.');p.fate--;room.game.die=rand(Math.max(2,Math.min(12,num(room.scenario.rules.diceSides,6))));room.game.moves=destinations(room,p.position,room.game.die);room.game.phase=room.game.moves.length?'move':'end';log(room,`${p.name} spent a Fate point to reroll movement: ${room.game.die}.`);emitRoom(room);});
 safeHandler(socket,'turn:shop',payload=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');const p=authTurn(socket,room,'shop');if(payload.buy&&p.gold<(room.game.shop?.cost||2))throw Error('Not enough gold to make the purchase.');doShop(room,p,!!payload.buy);emitRoom(room);});
 safeHandler(socket,'turn:choice',payload=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');const p=authTurn(socket,room,'choice');if(!['gold','health'].includes(payload.type))throw Error('Invalid choice.');doChoice(room,p,payload.type);emitRoom(room);});
 safeHandler(socket,'turn:end',()=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');authTurn(socket,room,'end');nextTurn(room);emitRoom(room);});
 safeHandler(socket,'turn:skip',()=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');hostOnly(socket,room);if(room.status!=='playing')throw Error('The game is not active.');const skipped=current(room);if(skipped.online)throw Error('You can only skip a disconnected player.');log(room,`${skipped.name}'s turn was skipped because they disconnected.`);nextTurn(room);emitRoom(room);});
 safeHandler(socket,'room:restart',()=>{const {room}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');hostOnly(socket,room);clearTimeout(botTimers.get(room.code));botTimers.delete(room.code);room.status='lobby';room.game=null;log(room,'The host returned the adventure to the lobby.');emitRoom(room);});
 safeHandler(socket,'room:chat',payload=>{const {room,player}=playerFor(socket)||{};if(!room)throw Error('Join a room first.');const message=clean(payload.text,350);if(!message)throw Error('Cannot send an empty message.');room.chat.push({id:id(),name:player.name,text:message,time:Date.now()});if(room.chat.length>120)room.chat.shift();emitRoom(room);});
 socket.on('disconnect',()=>{const pair=playerFor(socket);if(pair){pair.player.online=false;emitRoom(pair.room);}});
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Talismaker running on http://localhost:${PORT}`));
module.exports={server,io,rooms,neighbors,destinations};

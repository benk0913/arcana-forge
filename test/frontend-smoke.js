'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const assert=require('node:assert/strict');
const app={innerHTML:''},toast={innerHTML:''},listeners={},storage=new Map(),socketListeners={};
const doc={querySelector:(key)=>key==='#app'?app:key==='#toast'?toast:null,addEventListener:(event,callback)=>{listeners[event]=callback;}};
const socket={connected:false,on(name,fn){socketListeners[name]=fn;return this;},timeout(){return this;},emit(){return this;}};
const globals={window:{ArcanaDefaults:require('../public/defaults'),scrollTo(){},addEventListener(){}},io:()=>socket,document:doc,
 localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},location:{search:'',href:'http://localhost:3000/'},history:{replaceState(){}},URLSearchParams,URL,setTimeout,clearTimeout,Blob,console,confirm:()=>true};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8'),globals,{filename:'app.js'});
function click(action,id='',extra={}){listeners.click({target:{closest:()=>({dataset:{action,id,...extra}})},preventDefault(){}});}
function setBind(bind,value){listeners.change({target:{dataset:{bind},value,matches(){return false;}}});}
assert.match(app.innerHTML,/PLAY ADVENTURE/);assert.match(app.innerHTML,/WORLD WORKSHOP/);
assert.doesNotMatch(app.innerHTML,/World Canvas/i,'No editor should be visible from the main menu');
click('open-play');assert.match(app.innerHTML,/Choose your world/);assert.match(app.innerHTML,/Tides of the Lost Moon/);
assert.doesNotMatch(app.innerHTML,/Create with AI/,'AI Studio should not appear in Play mode');
click('home');click('open-library');assert.match(app.innerHTML,/Your Adventures/);
click('new-world');assert.match(app.innerHTML,/SPHERE MAP/);assert.match(app.innerHTML,/Board shape/);
setBind('board.theme.boardShape','square');assert.match(app.innerHTML,/shape-square/);
setBind('board.theme.tileSize','12');assert.match(app.innerHTML,/--tile-size:12%/);
click('wizard-next');assert.match(app.innerHTML,/REALMS EDITOR/);click('add-layer');assert.match(app.innerHTML,/New Realm/);
click('wizard-next');assert.match(app.innerHTML,/SPACES EDITOR/);assert.match(app.innerHTML,/Tile size/);click('add-cell','',{layer:'land_1'});
click('wizard-next');assert.match(app.innerHTML,/HEROES EDITOR/);click('add-character');
click('wizard-next');assert.match(app.innerHTML,/CARDS EDITOR/);click('add-card');click('deck-tab','item');click('add-card');click('deck-tab','spell');click('add-card');
click('wizard-next');assert.match(app.innerHTML,/Adventure Rules/);
click('finish-editor');assert.match(app.innerHTML,/Your Adventures/);
click('home');click('open-play');assert.match(app.innerHTML,/Choose your world/);
click('host-world',require('../public/defaults').makeSamples()[0].id); // no error even when id is no longer stable
assert.match(app.innerHTML,/Gather your party/);
// Test that a real lobby cannot display or navigate to any editor/menu path.
const world=require('../public/defaults').makeDefault();
socketListeners['room:state']({code:'ABC123',youId:'human',hostId:'human',status:'lobby',scenario:world,players:[{id:'human',name:'Tester',online:true,characterId:null,bot:false}],chat:[],log:[]});
assert.match(app.innerHTML,/SELECT YOUR HERO/);assert.doesNotMatch(app.innerHTML,/Customize World|WORLD WORKSHOP/);
click('new-world');assert.match(app.innerHTML,/SELECT YOUR HERO/,'World edit navigation must be blocked during session');
console.log('✓ Menu separation, dedicated Play/Workshop paths, wizard steps, square shape, configurable tiles, AI isolation, and in-session editor lock passed.');

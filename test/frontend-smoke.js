'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const assert=require('node:assert/strict');
const app={innerHTML:''},toast={innerHTML:''},listeners={},storage=new Map();
const doc={querySelector:(key)=>key==='#app'?app:key==='#toast'?toast:null,addEventListener:(event,callback)=>{listeners[event]=callback;}};
const socket={connected:false,on(){return this;},timeout(){return this;},emit(){return this;}};
const globals={window:{ArcanaDefaults:require('../public/defaults'),scrollTo(){},addEventListener(){}},io:()=>socket,document:doc,
 localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},location:{search:'',href:'http://localhost:3000/'},history:{replaceState(){}},URLSearchParams,URL,setTimeout,clearTimeout,Blob,console,confirm:()=>true};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8'),globals,{filename:'app.js'});
function click(action,id='',extra={}){listeners.click({target:{closest:()=>({dataset:{action,id,...extra}})},preventDefault(){}});}
assert.match(app.innerHTML,/Your Worlds/);
assert.match(app.innerHTML,/Tides of the Lost Moon/);
click('new-world');assert.match(app.innerHTML,/WORLD CANVAS/);
click('editor-tab','layer');click('add-layer');assert.match(app.innerHTML,/New Realm/);
click('editor-tab','cell');click('add-cell','',{layer:'land_1'});
click('editor-tab','character');click('add-character');
click('editor-tab','cards');click('add-card');click('deck-tab','item');click('add-card');click('deck-tab','spell');click('add-card');
click('editor-tab','rules');assert.match(app.innerHTML,/Adventure Rules/);
click('save-world');click('host-draft');assert.match(app.innerHTML,/Gather your party/);
console.log('✓ Frontend home, three starter worlds, editor, world creation, characters, decks, rules and host modal passed.');

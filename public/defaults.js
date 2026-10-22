(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ArcanaDefaults = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const uid = () => 'id_' + Math.random().toString(36).slice(2, 10);
  const layerData = [
    { id:'outer',name:'The Borderlands',radius:44,color:'#a89062',names:['The Wayfarer Inn','Whispering Woods','Ancient Ruins','The Merchant Road','Hollow Marsh','Fortune Shrine','The Wolf Den','Broken Bridge','Moonlit Grove','Bandit Pass','The Silver Market','Darkwater Ford','Old Watchtower','Witching Stones','The Golden Fields','Stormwatch','Forgotten Tomb','The Lantern Gate'] },
    { id:'middle',name:'The Ashen Reaches',radius:29,color:'#ad717a',names:['Obsidian Gates','Sundered Chapel','The Burning Vale','Hall of Echoes','Crimson Orchard','The Fallen Keep','The Astral Pool','Serpent Crossing','Ashen Monastery','The Iron Circle','Wraith Hollow','Gate of Cinders'] },
    { id:'inner',name:'The Starbound Sanctum',radius:14.5,color:'#8f8dde',names:['Celestial Stair','Astral Library','Mirror of Fate','Starfall Vault','The Final Ascent','The Aether Throne'] }
  ];
  const icons=['✦','♣','◆','⚒','☾','✺','♜','⚔','❀','⚑','◈','≈','♖','✧','❋','☄','♱','⟡'];
  const cells = [];
  layerData.forEach((layer,li) => layer.names.forEach((name,i) => {
    const types = li===0 ? ['draw_adventure','draw_adventure','draw_adventure','gold','draw_adventure','fate','draw_adventure','health','draw_spell','draw_adventure','draw_item','draw_adventure','strength','draw_spell','gold','craft','draw_adventure','draw_adventure']
       : li===1 ? ['draw_adventure','craft','draw_adventure','draw_spell','draw_adventure','draw_item','fate','draw_adventure','strength','draw_adventure','health','draw_adventure']
       : ['draw_adventure','draw_spell','fate','draw_item','draw_adventure','victory'];
    let effectType=li===0&&i===10?'shop':types[i];
    cells.push({id:`${layer.id}_${i}`,layerId:layer.id,name,subtitle:li===0?'THE OUTER REALM':li===1?'THE MIDDLE REALM':'THE INNER REALM',description: `${name} waits for those bold enough to take the road.`,icon:icons[(i+li*4)%icons.length],color:'',image:'',x:null,y:null,
      actions:[{type:effectType,amount:effectType==='gold'||effectType==='shop'?2:1,text:effectType==='victory'?'Claim the Aether Throne and win the adventure.':''}],links:[]});
  }));
  const link=(a,b)=>{const c=cells.find(x=>x.id===a); if(c && !c.links.includes(b))c.links.push(b);};
  [['outer_0','middle_0'],['outer_6','middle_4'],['outer_12','middle_8'],['middle_0','inner_0'],['middle_4','inner_2'],['middle_8','inner_4']].forEach(([a,b])=>link(a,b));
  const adventure=[
    ['Wandering Brigand','enemy',3,'A desperate brigand blocks the road.','⚔'],
    ['Bogborn Horror','enemy',5,'Something stirs beneath the black water.','☠'],
    ['The Moonlit Stag','event',0,'A silver stag offers a blessing.','✺'],
    ['Lost Caravan','treasure',0,'An abandoned cart contains a useful find.','⚒'],
    ['Ashen Knight','enemy',7,'A knight of cinders demands a duel.','♞'],
    ['Seer of the Hollow','event',0,'The seer whispers a secret spell.','◈'],
    ['Star Wraith','enemy',9,'A spirit forged from fallen constellations.','☽'],
    ['Forgotten Cache','treasure',0,'A hidden chest survived the ages.','◆'],
    ['Old Tollkeeper','event',0,'An ancient keeper demands a coin.','⚑'],
    ['Thornbound Beast','enemy',4,'A thorn-wrapped creature pounces.','♣'],
    ['Blessed Spring','event',0,'The spring restores a weary soul.','❋'],
    ['Rift Elemental','enemy',6,'An elemental escapes the glowing fissure.','☄'],
    ['Ghostly Trader','treasure',0,'A ghost offers a forgotten treasure.','♜'],
    ['Scholar of Stars','event',0,'You learn from the old celestial scrolls.','✧']
  ].map(([name,type,strength,description,icon],i)=>({id:`adv_${i}`,name,type,strength,craft:0,description,icon,image:'',effects:type==='enemy'?[{type:'gold',amount:2}]:type==='treasure'?[{type:'draw_item',amount:1}]:[{
    type:({2:'fate',5:'draw_spell',8:'gold',10:'health',13:'craft'})[i]||'gold',amount:i===8?-1:1
  }]}));
  const items=[
    ['Ironwood Sword','⚔',2,0,'An old but faithful blade.'],['Crystal Focus','✧',0,2,'It sharpens the inner eye.'],['Moonsteel Armor','♜',1,0,'Armor from the moonlit forge.'],['Sunfire Lance','☄',3,0,'It burns with a quiet flame.'],['Seer’s Amulet','◈',0,3,'The future bends around it.'],['Thorn Dagger','♠',1,1,'A blade balanced between worlds.'],['Runic Shield','⬡',1,1,'Warded against dark magic.'],['Star Crown','✦',2,2,'A small fragment of the heavens.']
  ].map(([name,icon,bonusStrength,bonusCraft,description],i)=>({id:`item_${i}`,name,icon,bonusStrength,bonusCraft,description,image:''}));
  const spells=[
    ['Restoration','✺','heal',2,'Restore two life.'],['Alchemist’s Gift','◆','gold',3,'Conjure three gold.'],['Battle Trance','⚔','power',3,'Add three power to your next battle this turn.'],['Second Chance','⟳','reroll',1,'Roll movement again.'],['Mystic Insight','◈','draw_spell',1,'Draw another spell.'],['Distant Step','☄','teleport',1,'Return to the starting space.'],['Vanishing Mist','☁','flee',1,'Escape your current enemy.'],['Arcane Ward','⬡','heal',1,'Restore one life.'],['Golden Touch','✦','gold',2,'Conjure two gold.']
  ].map(([name,icon,type,amount,description],i)=>({id:`spell_${i}`,name,icon,type,amount,description,image:''}));
  const characters=[
    ['Lyra Starweaver','The Astral Scholar','✧','#9f8ff3',4,2,5,3,1],
    ['Bram Ironheart','The Fallen Knight','⚔','#df986f',5,5,2,2,1],
    ['Mira Thornwood','The Wild Pathfinder','❀','#83ba91',5,3,3,4,2],
    ['Kael Nightwind','The Shadow Wanderer','☾','#80a4cc',4,4,3,3,3],
    ['Seraphine Vale','The Sunbound Oracle','✺','#dbb477',4,2,5,4,1],
    ['Orin Moss','The Wandering Tinkerer','⚒','#95bcb0',5,3,4,2,3]
  ].map(([name,title,icon,color,health,strength,craft,fate,gold],i)=>({id:`hero_${i}`,name,title,icon,color,health,strength,craft,fate,gold,image:''}));
  const makeDefault=()=>({id:uid(),title:'The Shattered Realms',tagline:'A journey through three worlds to claim the Aether Throne.',description:'Explore forgotten places, overcome enemies, collect arcane treasures, and reach the innermost throne before your rivals.',
    theme:{accent:'#d8af70',background:'#101722',boardImage:'',boardShape:'sphere',tileSize:9},layers:JSON.parse(JSON.stringify(layerData.map(({id,name,radius,color})=>({id,name,radius,color})))),cells:JSON.parse(JSON.stringify(cells)),characters:JSON.parse(JSON.stringify(characters)),decks:{adventure:JSON.parse(JSON.stringify(adventure)),item:JSON.parse(JSON.stringify(items)),spell:JSON.parse(JSON.stringify(spells))},rules:{startCellId:'outer_0',maxPlayers:6,diceSides:6,enemyDamage:1,respawnGoldLossPct:50}});
  const makeBlank=()=>{const s=makeDefault();s.id=uid();s.title='Untitled World';s.tagline='An adventure of your own making.';s.description='Write your story here.';s.layers=[{id:'land_1',name:'The First Lands',radius:39,color:'#9bb09b'}];s.cells=Array.from({length:12},(_,i)=>({id:uid(),layerId:'land_1',name:`Space ${i+1}`,subtitle:'DISCOVER',description:'A new adventure starts here.',icon:'✦',color:'',image:'',x:null,y:null,actions:[{type:i===11?'victory':'draw_adventure',amount:1,text:''}],links:[]}));s.rules.startCellId=s.cells[0].id;s.theme.accent='#93c8a9';return s;};
  const makeClockwork=()=>{
    const s=makeDefault();s.title='The Clockwork Expanse';s.tagline='A mechanical empire where time itself can be stolen.';
    s.description='Cross the copper wastelands and ticking citadels to reach the engine of eternity.';
    s.theme={accent:'#d9a777',background:'#211a1c',boardImage:'',boardShape:'sphere',tileSize:9};
    s.layers.forEach((l,i)=>{l.name=['The Brass Frontier','The Ember Mechanism','The Chrono Core'][i];l.color=['#bfa06a','#d07f66','#9e9dd1'][i];});
    const names=[['Gearspring Tavern','The Rust Dunes','Copper Caravan','Steam Hollow','The Sunken Foundry','Winding Bazaar','Cogwheel Woods','The Great Lift','Ashbank','Railway Junction','The Brass Market','Clockmaker’s Refuge','The Millworks','Glassworks','Tinker’s Tower','Boiler Wells','Scrapspire','Imperial Airship'],['The Soot Cathedral','Aether Furnace','Geargrave','Pendulum Court','The Gearwarden','The Coil Labyrinth','Midnight Observatory','Pressure Gates','The Machine Orchard','Cinder Gallery','The Broken Automaton','The Copper Gate'],['Sands of Time','The Eternal Bell','Paradox Chamber','Aether Dynamo','Final Gear','The World Engine']];
    s.cells.forEach((c,i)=>{const l=s.layers.findIndex(x=>x.id===c.layerId);const at=s.cells.slice(0,i).filter(x=>x.layerId===c.layerId).length;c.name=names[l][at];c.subtitle=['THE BRASS FRONTIER','THE INNER MACHINE','THE CORE'][l];c.description=`The machinery of ${c.name} whispers of a buried empire.`;c.icon=['⚙','◆','✦','⚒','✧','♜'][i%6];});
    const adventures=['Scrap Golem','The Rust Warden','Lost Engineer','Hidden Workshop','Brass Juggernaut','The Inventor','Clockwork Revenant','The Salvage Vault','The Collector','Sentry Automaton','Cooling Vents','Furnace Spirit','Clockwork Reliquary','Time Scholar'];
    s.decks.adventure.forEach((c,i)=>{c.name=adventures[i];c.description=`An encounter from the Clockwork Expanse: ${c.name}.`;});
    s.characters.forEach((c,i)=>{c.title=['The Chronomancer','The Brass Sentinel','The Rift Pilot','The Gear Rogue','The Oracle of Hours','The Master Mechanic'][i];});
    return s;
  };
  const makeTides=()=>{
    const s=makeDefault();s.title='Tides of the Lost Moon';s.tagline='Chart haunted waters and find the crown beneath the waves.';
    s.description='Voyage between cursed archipelagos, trade relics, and challenge the leviathans.';
    s.theme={accent:'#81c1c1',background:'#0b1e2a',boardImage:'',boardShape:'sphere',tileSize:9};
    s.layers=s.layers.slice(0,2);s.layers[0].name='The Broken Archipelago';s.layers[0].radius=42;s.layers[0].color='#72b5af';s.layers[1].name='The Sunken Kingdom';s.layers[1].radius=24;s.layers[1].color='#7994c7';
    const outer=['Harbor of Mists','Shell Island','Blackwater Shoals','The Coral Labyrinth','Mermaid’s Wake','Smuggler’s Haven','Tempest Cape','Sea Witch Reef','The Drowned Bell','Siren’s Rest','The Broken Fleet','Pearl Lagoon','Tidewatch','The Moonlit Dock'];
    const inner=['Abyssal Gate','The Last Lighthouse','Leviathan’s Keep','Temple of Pearls','The Deep Archive','Throne of Tides','The Sunken Garden','The Lost Moon'];
    s.cells=s.cells.filter(c=>c.layerId==='outer'&&Number(c.id.split('_')[1])<14||c.layerId==='middle'&&Number(c.id.split('_')[1])<8);
    for(const c of s.cells){const n=Number(c.id.split('_')[1]),o=c.layerId==='outer';c.name=(o?outer:inner)[n];c.subtitle=o?'THE BROKEN ISLES':'THE SUNKEN KINGDOM';c.description=`Salt, mist and ancient secrets surround ${c.name}.`;c.icon=['≈','☾','✦','⚓','♜','◆'][n%6];c.links=[];c.actions=[{type:'draw_adventure',amount:1,text:''}];}
    const get=id=>s.cells.find(c=>c.id===id);[['outer_0','middle_0'],['outer_5','middle_3'],['outer_10','middle_6']].forEach(([a,b])=>{get(a).links.push(b);});
    get('middle_7').actions=[{type:'victory',amount:1,text:'Claim the Lost Moon and become sovereign of the sea.'}];
    get('outer_0').actions=[{type:'draw_item',amount:1,text:''}];
    get('outer_5').actions=[{type:'gold',amount:2,text:''}];
    get('middle_4').actions=[{type:'draw_spell',amount:1,text:''}];
    s.decks.adventure.forEach((c,i)=>{const names=['Saltwater Raider','Reef Serpent','Moonlit Mermaid','Wreck of the Star','Deepsea Guardian','Ocean Oracle','Spectral Captain','Sunken Chest','Harbor Keeper','Sea Phantom','Healing Tide','Abyssal Terror','Pearl Trader','The Ancient Mariner'];c.name=names[i];c.description=`In the dark ocean you find ${c.name}.`;});
    s.characters.forEach((c,i)=>{c.title=['The Tidecaller','The Corsair','The Island Scout','The Night Captain','The Moon Priestess','The Shipwright'][i];});
    s.rules.startCellId='outer_0';return s;
  };
  const makeSamples=()=>[makeDefault(),makeClockwork(),makeTides()];
  return {makeDefault,makeBlank,makeSamples,uid};
});

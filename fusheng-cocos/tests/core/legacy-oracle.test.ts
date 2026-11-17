import {it,expect}from'vitest';import fs from'node:fs';import vm from'node:vm';import{parse}from'acorn';import{Content,copy,NEED_KEYS}from'../../assets/scripts/core/Types';import{Sim}from'../../assets/scripts/core/Sim';
const html=fs.readFileSync('../game/index.html','utf8'),source=html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>'));
const c=JSON.parse(fs.readFileSync('assets/resources/config/content.json','utf8')) as Content;
const ast=parse(source,{ecmaVersion:2022});
const functions=new Map(ast.body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,source.slice(n.start,n.end)]));
const names=['addNeed','addMoney','mods','earnMoney','addWarm','addBuff','skillName','xpNeed','addXp','moodInfo','doCook','doFridge','doShower','doSofa','doTV','doPaint','doDesk','doTea','doPlant','doBook','doWardrobe'];
it('native core action effects match the unchanged v4.1 JS oracle for all 11 non-sleep actions',()=>{
 for(const[id,fn]of Object.entries({stove:'doCook',fridge:'doFridge',shower:'doShower',sofa:'doSofa',tv:'doTV',easel:'doPaint',desk:'doDesk',tea:'doTea',plant:'doPlant',bookshelf:'doBook',wardrobe:'doWardrobe'})){
  const sim=new Sim(c,{mode:"classic",originId:'normal',charId:'ding',seed:2});sim.state.needs={energy:40,food:40,clean:40,fun:40};sim.state.tasks=[];sim.state.growth={body:3,mind:4,charm:5};const before=copy(sim.state),random=sim.random();sim.state.rng=before.rng;
  const legacy={...copy(before),origin:{mods:{}},creed:null,buffs:[]};const context=vm.createContext({S:legacy,clamp:(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v)),Math:Object.assign(Object.create(Math),{random:()=>random}),bump:()=>{},toast:()=>{},spawnInk:()=>{},pick:(arr:string[])=>arr[0],rand:(a:number,b:number)=>a+random*(b-a),PAINT_TITLES:['oracle']});
  vm.runInContext(names.map(name=>functions.get(name)).join('\n')+'\n'+fn+'();',context);sim.effects(c.actions[id]);for(const k of NEED_KEYS)expect(sim.state.needs[k],id+' '+k).toBeCloseTo(legacy.needs[k]);expect(sim.state.money,id+' money').toBe(legacy.money);expect(sim.state.skills,id+' skills').toEqual(legacy.skills);expect(sim.state.stats,id+' stats').toEqual(legacy.stats);
 }
});
it('all 19 narrative definitions and four NPC topics match original option effects, including failed outcomes',()=>{
 const tables=new Map<string,string>();for(const n of ast.body)if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier'&&['EVENTS','TWISTS','STORY'].includes(d.id.name))tables.set(d.id.name,source.slice(d.init!.start,d.init!.end));
 const npc=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='talkToNpc');if(!npc||npc.type!=='FunctionDeclaration')throw Error('Missing NPC');const optDecl=npc.body.body.find(n=>n.type==='VariableDeclaration');if(!optDecl||optDecl.type!=='VariableDeclaration')throw Error('Missing NPC topics');tables.set('NPC',source.slice(optDecl.declarations[0].init!.start,optDecl.declarations[0].init!.end));
 for(const [table,json]of [['EVENTS',c.events],['TWISTS',c.twists],['STORY',c.story],['NPC',[{options:c.npc.options}]]] as const){
  const pool=vm.runInNewContext('('+tables.get(table)+')');for(let i=0;i<json.length;i++){const legacyOpts=table==='NPC'?pool:typeof pool[i].opts==='function'?pool[i].opts():pool[i].opts;
   for(let j=0;j<json[i].options.length;j++)for(const trust of [12,30])for(const forcedRandom of [.1,.9]){
    const sim=new Sim(c,{mode:"classic",originId:'normal',charId:'ding',seed:3});sim.state.tasks=[];sim.state.money=500;sim.state.rel.trust=trust;const original={...copy(sim.state),origin:{mods:{}},creed:null};const context=vm.createContext({S:original,clamp:(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v)),Math:Object.assign(Object.create(Math),{random:()=>forcedRandom}),reply:()=>{},toast:()=>{},bump:()=>{}});
    const method=legacyOpts[j].onClick.toString();vm.runInContext(names.filter(n=>!n.startsWith('do')).map(n=>functions.get(n)).join('\n')+'\n({'+method+'}).onClick();',context);sim.random=()=>forcedRandom;sim.effects(json[i].options[j].effects);
    expect(sim.state.money,table+':'+i+':'+j).toBe(original.money);expect(sim.state.needs).toEqual(original.needs);expect(sim.state.skills).toEqual(original.skills);expect(sim.state.rel).toEqual(original.rel);expect(sim.state.clock).toBe(original.clock);expect(sim.state.story).toEqual(original.story);expect(sim.state.buffs.map(b=>({v:b.v,a:b.a,until:b.until}))).toEqual(original.buffs.map(b=>({v:b.v,a:b.a,until:b.until})));
   }
  }
 }
});

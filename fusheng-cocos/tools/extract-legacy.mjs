// Build-time only: read the immutable v4.1 source. No legacy script ships at runtime.
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
const html=fs.readFileSync('../game/index.html','utf8');
const source=html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>'));
const ast=parse(source,{ecmaVersion:2022});
const defs=new Map(), funcs=new Map();
for(const n of ast.body){if(n.type==='VariableDeclaration')for(const d of n.declarations)defs.set(d.id.name,d.init);if(n.type==='FunctionDeclaration')funcs.set(n.id.name,n);}
const raw=n=>source.slice(n.start,n.end);
const evaluate=n=>vm.runInNewContext('('+raw(n)+')');
const get=name=>evaluate(defs.get(name));
fs.mkdirSync('content/i18n',{recursive:true});
const strings={}, textIds=new Map();
function text(value,key){if(!/[\u3400-\u9fff]/.test(value))return value;if(textIds.has(value))return textIds.get(value);const id='@'+key;strings[id.slice(1)]=value;textIds.set(value,id);return id;}
function localize(v,key){if(typeof v==='string')return text(v,key);if(Array.isArray(v))return v.map((x,i)=>localize(x,key+'.'+i));if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,localize(x,key+'.'+k)]));return v;}
function expr(n,key){
 if(!n)return 0;
 if(n.type==='Literal')return typeof n.value==='string'?text(n.value,key):n.value;
 if(n.type==='UnaryExpression'&&n.operator==='-')return {op:'neg',args:[expr(n.argument,key)]};
 if(n.type==='Identifier')return {variable:n.name};
 if(n.type==='MemberExpression'){const p=raw(n);if(p.startsWith('S.'))return {path:p.slice(2)};throw Error('Unsupported path '+p);}
 if(n.type==='BinaryExpression'||n.type==='LogicalExpression')return {op:n.operator,args:[expr(n.left,key+'.l'),expr(n.right,key+'.r')]};
 if(n.type==='CallExpression'){
 const c=raw(n.callee);if(c==='Math.random')return {random:true};
 if(c==='mods')return {mod:'all'};
 if(c==='hourNow')return {path:'hour'};
 if(c==='Math.round'||c==='Math.floor'||c==='Math.max'||c==='Math.min'||c==='clamp')return {op:c.replace('Math.',''),args:n.arguments.map((a,i)=>expr(a,key+'.'+i))};
 }
 if(n.type==='MemberExpression'&&n.object.type==='CallExpression')return {mod:n.property.name};
 throw Error('Unsupported expression '+raw(n));
}
function condition(n,key){
 if(n.type==='BinaryExpression'&&raw(n.left)==='Math.random()')return {type:'chance',p:evaluate(n.right)};
 if(n.type==='BinaryExpression'&&raw(n.left)==='S.money'&&n.right.type==='Literal')return {type:n.operator==='<'?'moneyBelow':'moneyAtLeast',value:n.right.value};
 if(n.type==='BinaryExpression'&&raw(n.left)==='S.rel.trust')return {type:'trustAtLeast',value:n.right.value};
 return {type:'compare',left:expr(n.left,key),op:n.operator,right:expr(n.right,key)};
}
function statements(nodes,key){return nodes.flatMap((n,i)=>statement(n,key+'.'+i));}
function statement(n,key){
 if(n.type==='BlockStatement')return statements(n.body,key);
 if(n.type==='ReturnStatement')return [{type:'stop'}];
 if(n.type==='IfStatement')return [{type:'branch',condition:condition(n.test,key+'.cond'),then:statement(n.consequent,key+'.then'),else:n.alternate?statement(n.alternate,key+'.else'):[]}];
 if(n.type==='VariableDeclaration')return n.declarations.map(d=>({type:'let',key:d.id.name,value:expr(d.init,key)}));
 if(n.type!=='ExpressionStatement')throw Error('Unsupported statement '+raw(n));
 const e=n.expression;
 if(e.type==='AssignmentExpression'){
 const path=raw(e.left).replace(/^S\./,'');
 if(path==='clock')return [{type:'clock',minutes:expr(e.right,key)}];
 if(path.startsWith('rel.')){const value=e.right.arguments[0];return [{type:'rel',key:path.slice(4),delta:value.operator==='-'?{op:'neg',args:[expr(value.right,key)]}:expr(value.right,key)}];}
 if(path==='story.fair')return [{type:'flag',key:'story.fair',value:true}];
 throw Error('Unsupported assignment '+raw(e));
 }
 if(e.type==='UpdateExpression'&&raw(e.argument).startsWith('S.stats.'))return [{type:'stat',key:raw(e.argument).slice(8),delta:1}];
 if(e.type!=='CallExpression')throw Error('Unsupported effect '+raw(e));
 const c=raw(e.callee), a=e.arguments.map((v,i)=>expr(v,key+'.arg'+i));
 const types={addMoney:()=>({type:'money',delta:a[0]}),addNeed:()=>({type:'need',key:a[0],delta:a[1]}),addWarm:()=>({type:'warm',delta:a[0]}),addXp:()=>({type:'xp',skill:a[0],amount:a[1]}),addBuff:()=>({type:'buff',nameKey:a[0],v:a[1],a:a[2],hours:a[3]}),bump:()=>({type:'task',key:a[0],amount:a[1]??1}),reply:()=>({type:'reply',whoKey:a[0],textKey:a[1]}),toast:()=>({type:'toast',textKey:a[0]}),travel:()=>({type:'travel',scene:a[0],x:a[1]??null}),sleepNow:()=>({type:'sleep'}),spawnInk:()=>null};
 if(types[c]){const result=types[c]();return result?[result]:[];}
 if(c.startsWith('act'))return [{type:'action',id:c}];
 throw Error('Unsupported call '+c);
}
function compile(fn,key){const str='({'+fn.toString()+'})';const tree=parse(str,{ecmaVersion:2022});const method=tree.body[0].expression.properties[0].value; // remap offsets into the legacy source
 const at=source.indexOf(fn.toString());if(at<0)throw Error('Missing method');
 const adjust=n=>{if(!n||typeof n!=='object')return; if(typeof n.start==='number'){n.start+=at-2;n.end+=at-2;}for(const [k,v]of Object.entries(n))if(k!=='start'&&k!=='end'){if(Array.isArray(v))v.forEach(adjust);else if(v&&typeof v==='object')adjust(v);}};adjust(method);
 return statements(method.body.body,key);
}
const write=(name,v)=>fs.writeFileSync('content/'+name+'.json',JSON.stringify(localize(v,name),null,2)+'\n');
write('origins',get('ORIGINS'));write('characters',get('CHARS'));write('creeds',get('CREEDS'));
const houses=get('HOUSES');const defaultPlaced=vm.runInNewContext('('+raw(funcs.get('defaultPlaced'))+')');
for(const h of Object.values(houses))h.placed=defaultPlaced(h.id).map(({t,...p})=>({...p,furnitureId:t}));write('houses',houses);
write('tasks',get('TASK_POOL').map(t=>({...t,requires:get('TASK_REQ')[t.key]??null})));
write('skills',['paint','cook','social'].map((id,i)=>({id,name:['绘画','烹饪','社交'][i]})));
const furniture=get('FURN');const actions={};
for(const [id,f]of Object.entries(furniture)){
 f.buildable=get('BUILDABLE').includes(id);
 if(f.use){actions[id]=id==='easel'?[{type:'paint'}]:[];const fnName={bed:'sleepNow',stove:'doCook',fridge:'doFridge',shower:'doShower',sofa:'doSofa',tv:'doTV',desk:'doDesk',tea:'doTea',plant:'doPlant',bookshelf:'doBook',wardrobe:'doWardrobe'}[id];
 if(fnName&&fnName!=='sleepNow'){
  // cook cost remains an expression in data; no closure in runtime content.
  let node=funcs.get(fnName);if(id==='stove')node={...node,body:{...node.body,body:node.body.body.slice(1)}};
  actions[id]=statements(node.body.body,'actions.'+id);
  if(id==='stove')actions[id].unshift({type:'let',key:'cost',value:{op:'round',args:[{op:'*',args:[8,{mod:'cookCost'}]}]}});
 }if(id==='bed')actions[id]=[{type:'sleep'}];f.use={label:f.use.label,duration:f.use.dur,actionId:id};
 }
}
for(const name of ['actBench','actPigeon','actPond','actBento','actDrink','actClerk','actBrowse','actBuyBook','actBoss'])actions[name]=statements(funcs.get(name).body.body,'actions.'+name);
write('furniture',furniture);write('actions',actions);
const scenes=get('SCENES');for(const sc of Object.values(scenes))for(const [i,p]of sc.props.entries()){p.id=sc.id+'_'+i;p.effects=compile(p.act,'scenes.'+p.id);delete p.act;}write('scenes',scenes);
function narrative(name,list){return list.map(n=>{const result={id:n.id,title:n.title,body:typeof n.body==='function'?'':n.body,weight:n.w??1,where:n.where??null,day:n.day??null,seal:n.seal??'',sub:n.sub??'',conditions:n.id==='emo'?[{type:'hourBetween',from:21,to:2}]:[],options:(typeof n.opts==='function'?n.opts():n.opts).map((o,i)=>({id:n.id+'_'+i,label:o.label,hint:o.hint??'',effects:compile(o.onClick,name+'.'+n.id+'.option'+i)}))};return result;});}
write('events',narrative('events',get('EVENTS')));write('twists',narrative('twists',get('TWISTS')));
const stories=get('STORY'), storyData=narrative('story',stories);
for(let i=0;i<stories.length;i++){
 const n=stories[i];storyData[i].bodyVariants=[];
 for(const o of get('ORIGINS')){const context={S:{origin:{id:o.id}}};const str='({'+n.body.toString()+'}).body()';const body=vm.runInNewContext(str,context);storyData[i].bodyVariants.push({conditions:[{type:'originIn',ids:[o.id]}],body});}
 storyData[i].body=storyData[i].bodyVariants[0].body;
}write('story',storyData);
const npcFn=funcs.get('talkToNpc');const opts=npcFn.body.body.find(n=>n.type==='VariableDeclaration').declarations[0].init;
write('npc',{...get('NPC'),title:'邻居老周',body:'<p>老周站在客厅中间，手里拎着一个空碗，像是刚打完酱油路过。</p>',sub:'一个住在隔壁、永远有空的普通人',options:evaluate(opts).map((o,i)=>({id:'npc_'+i,label:o.label,hint:o.hint,effects:compile(o.onClick,'npc.option'+i)}))});
const proFunc=raw(funcs.get('buildPrologue'));
const prologue={};for(const h of Object.values(houses))for(const o of get('ORIGINS')){
 const beats=vm.runInNewContext('('+proFunc+')()',{S:{origin:o,char:{name:'{name}',tag:'{tag}'}},HOUSE:h});
 prologue[h.id+'.'+o.id]=beats;
}write('prologue',prologue);
write('paint-titles',get('PAINT_TITLES'));
write('rules',{taskCount:3,wakeEnergy:100,twist:{minDay:2,maxDay:5,avoidDays:[2,4,6],refreshWeeks:3},travel:{minutes:20,latestClock:1439},ending:{paintingWeight:2,moneyDivisor:40,warmDivisor:8,thresholds:[22,12,5]},interaction:{floorTolerance:14,propFloorTolerance:16,minFurnitureReach:54,furnitureReachPad:20,minPropReach:60,propReachPad:22,npcReach:66,doorReach:70,doorPriorityReach:46},simStep:.1,gameMinutesPerSecond:12,daysPerYear:7,startAge:7,maxAge:30,startClock:420,endClock:1440,speeds:[1,2,4],autosaveSeconds:15,needs:{energy:78,food:56,clean:70,fun:62},rel:{warm:18,trust:12,tension:4},decay:{energy:3/60,food:4.5/60,clean:2.4/60,fun:3/60},bodyDecayCap:.25,bodyDecayFactor:.008,xpBase:30,xpLevel:22,mindXpFactor:.02,charmWarmFactor:.01,skillMax:10,taskReward:{fun:6,rep:1},buffMax:5,mood:{center:50,valenceFactor:1.25,arousalBase:30,funFactor:.45,energyFactor:.25,excitedV:18,excitedA:58,calmV:-8,lowV:-34,irritatedA:48},paint:{base:46,levelFactor:6,moodFactor:.24,randomMin:-9,randomMax:9,min:22,max:100,priceFactor:.85,fun:9,energy:-9,clean:-3,xp:20},event:{chance:.08,maxPerDay:2,earliestHour:8},npc:{startHour:9,endHour:21,x:764,reach:66},movement:{speed:205,climbSpeed:150,gravity:1500,jump:-430},wealth:{upMid:450,upRich:1100,downMid:500,downPoor:90},growth:{doubleChance:.22,childCharmChance:.45,adultAge:14,midAge:24},wakeNeeds:{food:-14,clean:-8,fun:-5},legacy:{moneyFactor:.5,moneyBase:60,skillFactor:.7,rep:2,needs:{energy:100,food:70,clean:80,fun:60},rel:{warm:10,trust:8,tension:0}},build:{grid:20,floorReach:90,margin:18,collisionInset:6,refund:.6,longPress:.55},originWealth:get('ORIGIN_WEALTH'),wealthHouse:get('WEALTH_HOUSE'),arrival:get('ARRIVE')});
// Preserve every original literal as a searchable translation source, including UI prose.
function visit(n){if(!n||typeof n!=='object')return;if(n.type==='Literal'&&typeof n.value==='string')text(n.value,'legacy.'+n.start);for(const [k,v]of Object.entries(n))if(k!=='start'&&k!=='end'){if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}}visit(ast);
fs.writeFileSync('content/i18n/zh-CN.json',JSON.stringify(strings,null,2)+'\n');
console.log('Extracted content from immutable Web v4.1; translations:',Object.keys(strings).length);

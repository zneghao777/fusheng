import assert from 'node:assert/strict';
import Ajv from 'ajv';
const ajv=new Ajv({allErrors:true,allowUnionTypes:true});
const expression={anyOf:[{type:['number','string','boolean','null']},{type:'object',properties:{op:{enum:['neg','+','-','*','/','round','floor','min','max','clamp']},args:{type:'array',items:{$ref:'#/$defs/expr'}},path:{type:'string'},variable:{type:'string'},random:{type:'boolean'},mod:{enum:['income','warm','foodDecay','cookCost','paint']}},additionalProperties:false}]};
const effectTypes=['money','need','warm','rel','xp','buff','task','clock','flag','stat','toast','reply','travel','action','sleep','paint','stop','let','branch'];
const effectSchema={$defs:{expr:expression,effect:{type:'object',required:['type'],properties:{type:{enum:effectTypes},delta:{$ref:'#/$defs/expr'},value:{anyOf:[{$ref:'#/$defs/expr'},{type:'boolean'}]},amount:{$ref:'#/$defs/expr'},minutes:{$ref:'#/$defs/expr'},v:{$ref:'#/$defs/expr'},a:{$ref:'#/$defs/expr'},hours:{$ref:'#/$defs/expr'},then:{type:'array',items:{$ref:'#/$defs/effect'}},else:{type:'array',items:{$ref:'#/$defs/effect'}},condition:{type:'object',required:['type'],properties:{type:{enum:['chance','moneyBelow','moneyAtLeast','trustAtLeast','hourBetween','originIn','compare']}}}},additionalProperties:true}},type:'array',items:{$ref:'#/$defs/effect'}};
const checkEffects=ajv.compile(effectSchema);
export function validate(c){
 const counts={origins:10,characters:6,creeds:3,houses:3,furniture:14,tasks:8,skills:3,scenes:4,events:8,twists:8,story:3};
 for(const [table,count] of Object.entries(counts)){assert.equal(Object.keys(c[table]).length,count,table+' count');const values=Array.isArray(c[table])?c[table]:Object.values(c[table]);const ids=values.map(v=>v.id??v.key).filter(Boolean);assert.equal(ids.length,new Set(ids).size,table+' duplicate ids');}
 assert.equal(Object.values(c.furniture).filter(f=>f.use).length,12);assert.equal(Object.values(c.furniture).filter(f=>f.buildable).length,6);
 for(const f of Object.values(c.furniture)){assert(f.price>=0&&f.w>0&&f.h>0);if(f.use){assert(f.use.duration>0);assert(c.actions[f.use.actionId]);}}
 for(const h of Object.values(c.houses))for(const f of h.placed)assert(c.furniture[f.furnitureId]);
 for(const a of Object.values(c.actions)){assert(checkEffects(a),JSON.stringify(checkEffects.errors));}
 for(const n of [...c.events,...c.twists,...c.story,c.npc]){assert(n.options.length);for(const o of n.options)assert(checkEffects(o.effects),JSON.stringify(checkEffects.errors));}
 const course=c['life-course'];
 assert(course?.version===1,'life-course version');
 assert.equal(course.stages.length,5,'five life stages');
 for(let age=7;age<=30;age++)assert.equal(course.stages.filter(stage=>age>=stage.minAge&&age<=stage.maxAge).length,1,'stage coverage at '+age);
 for(const stage of course.stages){
  assert(stage.name&&stage.goal&&stage.home&&stage.yearGoal,'stage copy');
  assert.equal(stage.activities.length,3,'three complete stage activities');
  assert.equal(new Set(stage.activities.map(a=>a.id)).size,3,'unique activities');
  for(const activity of stage.activities)assert(activity.focus>=1&&activity.focus<=3&&activity.minutes>0&&activity.minutes<600&&activity.money>=0,'activity bounds');
 }
 assert.equal(new Set(course.milestones.map(m=>m.age)).size,course.milestones.length,'unique milestone ages');
 for(const milestone of course.milestones){assert(milestone.age>=7&&milestone.age<=30&&milestone.choices.length===3,'milestone bounds');for(const choice of milestone.choices)assert(choice.id.startsWith(milestone.age+'-')&&choice.hint&&choice.result,'choice outcome');}
 function walk(v){if(typeof v==='string'&&v.startsWith('@'))assert(v.slice(1) in c.i18n,'Missing i18n '+v);if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')Object.values(v).forEach(walk);}
 for(const [k,v]of Object.entries(c))if(k!=='i18n'&&k!=='ui')walk(v);
 return true;
}

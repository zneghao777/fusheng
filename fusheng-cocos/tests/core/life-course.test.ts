import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { Sim, DEFAULT_SETTINGS } from '../../assets/scripts/core/Sim';
import { createCourse, validCourse } from '../../assets/scripts/core/LifeCourse';
import { Content, copy, Command } from '../../assets/scripts/core/Types';
import { checksum, MemoryDriver, SaveService } from '../../assets/scripts/platform/SaveService';
const content=JSON.parse(fs.readFileSync('assets/resources/config/content.json','utf8')) as Content;
const make=()=>new Sim(content,{originId:'normal',charId:'ding',seed:83});
function choose(s:Sim,index=0){const m=s.course.milestone;if(m){s.course.openYear();s.dispatch({type:'Course',action:'choose',id:m.choices[index].id});s.dispatch({type:'Continue'});}}
function rest(s:Sim){s.state.panel=null;s.dispatch({type:'Sleep'});if(s.state.panel?.kind==='RestConfirm')s.dispatch({type:'Life',action:'rest'});s.dispatch({type:'Continue'});}
function advanceYear(s:Sim){for(let d=s.state.day;d<=7;d++)rest(s);expect(s.state.panel?.kind).toBe('WeekRecap');s.dispatch({type:'Continue'});choose(s);}
describe('the seven-to-thirty life course',()=>{
 it('connects origin to the first permanent choice and blocks skipping it',()=>{
  const s=make();expect(s.state.age).toBe(7);s.dispatch({type:'FinishPrologue'});s.dispatch({type:'Continue'});expect(s.state.panel?.kind).toBe('LifeChoice');
  const before=copy(s.state);s.dispatch({type:'Continue'});s.dispatch({type:'Life',action:'paint',id:'window',style:'warm'});expect(s.state).toEqual(before);
  const id=s.course.milestone!.choices[0].id;s.dispatch({type:'Course',action:'choose',id});expect(s.course.data.choices['7']).toBe(id);expect(s.course.data.metrics.learning).toBe(3);const metrics=copy(s.course.data.metrics);s.dispatch({type:'Course',action:'choose',id});expect(s.course.data.metrics).toEqual(metrics);
 });
 it('makes stage activities consume time/focus once per day with persistent direction consequences',()=>{
  const s=make();choose(s);const a=s.course.activities[0];s.dispatch({type:'Course',action:'open'});const t=s.state.clock;s.dispatch({type:'Course',action:'activity',id:a.id});expect(s.state.clock).toBe(t+90);expect(s.state.life!.focus).toBe(2);expect(s.course.data.metrics.learning).toBe(6);expect(s.course.activityDone(a.id)).toBe(true);
  s.dispatch({type:'Continue'});s.dispatch({type:'Course',action:'open'});const before=copy(s.state);s.dispatch({type:'Course',action:'activity',id:a.id});expect(s.state).toEqual(before);rest(s);s.dispatch({type:'Course',action:'open'});s.dispatch({type:'Course',action:'activity',id:a.id});expect(s.course.data.metrics.learning).toBe(9);
  const funds=s.state.money;s.effects(content.actions.stove);expect(s.state.money).toBe(funds);
  s.state.money=0;s.state.needs.food=5;s.effects(content.actions.stove);expect(s.state.needs.food).toBe(51);expect(s.state.money).toBe(0);
  for(const id of ['actPigeon','actBento','actDrink','actBuyBook']){const clock=s.state.clock;s.effects(content.actions[id]);expect(s.state.clock).toBeGreaterThan(clock);expect(s.state.money).toBe(0);}expect(s.drainEvents().filter(e=>e.type==='Toast').some(e=>e.type==='Toast'&&e.key.includes('班味'))).toBe(false);
 });
 it('guards invalid/foreign activities, late hours and focus without granting resources',()=>{
  const s=make();choose(s);s.dispatch({type:'Course',action:'open'});const before=copy(s.state);s.dispatch({type:'Course',action:'activity',id:'adult-work'});expect(s.state).toEqual(before);
  s.state.life!.focus=0;const money=s.state.money;s.dispatch({type:'Course',action:'activity',id:s.course.activities[0].id});expect(s.state.money).toBe(money);expect(s.course.data.activityDays).toEqual({});
  s.state.life!.focus=3;s.state.clock=1400;s.dispatch({type:'Course',action:'activity',id:s.course.activities[0].id});expect(s.state.life!.focus).toBe(3);
 });
 it('protects children from borrowing and gives age-appropriate supported projects',()=>{
  const s=make();s.state.clock=600;s.state.life!.neighbors.zhou.trust=100;const money=s.state.money;s.dispatch({type:'Life',action:'borrow',id:'zhou'});expect(s.state.money).toBe(money);expect(s.state.life!.neighbors.zhou.loan).toBe(0);
  expect(s.life.commissionFor('lin')!.reward).toBe(35);s.state.age=13;expect(s.life.commissionFor('lin')!.reward).toBe(50);s.state.age=18;expect(s.life.commissionFor('lin')!.reward).toBe(100);
 });
 it('runs exactly 168 playable days and completes every stage and milestone once, preserving the home',()=>{
  const s=make();choose(s,1);s.dispatch({type:'Life',action:'paint',id:'window',style:'warm'});const work=s.state.life!.works[0];s.state.panel=null;s.dispatch({type:'Life',action:'hang',id:work.id,slot:0});s.state.panel=null;const layout=copy(s.state.placed),seen=new Set<string>();let days=0;
  while(!s.course.finished&&days<200){seen.add(s.course.stage.id);s.state.panel=null;s.dispatch({type:'Course',action:'open'});s.dispatch({type:'Course',action:'activity',id:s.course.activities[0].id});rest(s);days++;if(s.state.panel?.kind==='WeekRecap'){s.dispatch({type:'Continue'});if(!s.course.finished)choose(s);}}
  expect(days).toBe(168);expect(s.state.age).toBe(30);expect(s.state.week).toBe(24);expect(s.state.day).toBe(7);expect(s.state.panel?.kind).toBe('LifeEnding');expect(seen).toEqual(new Set(['child','teen','youth','adult','midlife']));
  expect(s.course.data.years.map(y=>y.age)).toEqual(Array.from({length:24},(_,i)=>i+7));expect(Object.keys(s.course.data.choices).map(Number)).toEqual([7,12,13,17,18,23,24,29,30]);expect(work.status).toBe('displayed');expect(s.state.placed).toEqual(layout);expect(s.course.data.years.at(-1)!.metrics.vocation).toBeGreaterThan(0);
  const finished=copy(s.state),commands:Command[]=[{type:'Continue'},{type:'Sleep'},{type:'Travel',scene:'street'},{type:'Life',action:'paint',id:'window',style:'warm'},{type:'Course',action:'activity',id:'midlife-work'},{type:'PlaceFurniture',furnitureId:'plant',x:500,y:600},{type:'Legacy',creedId:'chi'}];for(const command of commands)s.dispatch(command);s.tick();s.advance(1);s.effects(content.actions.stove);expect(s.state).toEqual(finished);
 });
 it('carries eighteen-year weekly saves forward without changing their age, works, or day',()=>{
  const s=make();s.state.age=18;s.state.week=6;s.state.day=4;delete s.state.life!.course;const original=copy(s.state);const r=new Sim(content,{state:s.state});expect(r.state.age).toBe(18);expect(r.state.week).toBe(6);expect(r.state.day).toBe(4);expect(r.course.data.startedAge).toBe(18);expect(r.state.life!.works).toEqual(original.life!.works);
  for(let i=0;i<4;i++)rest(r);r.dispatch({type:'Continue'});expect(r.state.age).toBe(19);expect(r.state.week).toBe(7);
 });
 it('resets each years promise while preserving the earned keepsake and memory',()=>{
  const s=make();choose(s);s.state.clock=600;s.dispatch({type:'Life',action:'promise',id:'zhou'});s.state.panel=null;s.dispatch({type:'Life',action:'help',id:'zhou'});expect(s.state.life!.help).toBe('done');const memories=copy(s.state.life!.neighbors.zhou.memories);advanceYear(s);expect(s.state.life!.help).toBe('open');expect(s.state.life!.keepsakes.some(k=>k.id==='zhou')).toBe(true);expect(s.state.life!.neighbors.zhou.memories).toEqual(memories);
 });
 it('migrates classic saved inheritance into the fixed chapter ending',()=>{const s=new Sim(content,{mode:'classic'});s.state.age=30;s.state.panel={kind:'Legacy'};s.state.dayEnded=false;const r=new Sim(content,{state:s.state});expect(r.state.panel?.kind).toBe('LifeEnding');const before=copy(r.state);r.dispatch({type:'Legacy',creedId:'chi'});r.dispatch({type:'FinishPrologue'});r.effects(content.actions.stove);expect(r.state).toEqual(before);});
 it('saves choices, yearly records and the terminal page and rejects forged future history',()=>{
  const s=make(),svc=new SaveService(new MemoryDriver(),content,()=>1,()=> 'course');choose(s);s.dispatch({type:'Course',action:'open'});s.dispatch({type:'Course',action:'activity',id:s.course.activities[0].id});advanceYear(s);
  const saved=svc.write(1,s.state,DEFAULT_SETTINGS);expect(svc.parse(JSON.stringify(saved)).state).toEqual(s.state);const r=new Sim(content,{state:svc.load(1)!.state});expect(r.course.data).toEqual(s.course.data);
  const bad=copy(saved);bad.state.life!.course!.choices['30']='30-work';bad.checksum=checksum(JSON.stringify(bad.state));expect(()=>svc.parse(JSON.stringify(bad))).toThrow('corrupt');expect(validCourse({...s.course.data,years:[...s.course.data.years,...s.course.data.years]})).toBe(false);
  s.state.age=30;s.state.day=7;s.state.life!.course=createCourse(30);s.course.complete();const end=svc.write(2,s.state,DEFAULT_SETTINGS);const ended=new Sim(content,{state:svc.parse(JSON.stringify(end)).state});expect(ended.course.finished).toBe(true);expect(ended.state.panel?.kind).toBe('LifeEnding');
 });
});

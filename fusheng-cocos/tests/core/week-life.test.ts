import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { Sim, DEFAULT_SETTINGS } from '../../assets/scripts/core/Sim';
import { Artwork, LifeAction, validLife } from '../../assets/scripts/core/WeekLife';
import { createCourse } from '../../assets/scripts/core/LifeCourse';
import { Content, copy } from '../../assets/scripts/core/Types';
import { checksum, MemoryDriver, SaveService } from '../../assets/scripts/platform/SaveService';
const content=JSON.parse(fs.readFileSync('assets/resources/config/content.json','utf8')) as Content;
const make=()=>{const sim=new Sim(content,{originId:'normal',charId:'ding',seed:123});sim.state.age=18;sim.state.life!.course=createCourse(18);return sim;};
const send=(s:Sim,action:LifeAction,id?:string,extra:Record<string,unknown>={})=>s.dispatch({type:'Life',action,id,...extra});
function close(s:Sim){s.state.panel=null;}
function day(s:Sim){close(s);s.dispatch({type:'Sleep'});if(s.state.panel?.kind==='RestConfirm')send(s,'rest');s.dispatch({type:'Continue'});}
function visit(s:Sim,scene:'home'|'street'|'book'|'store'|'park'){close(s);s.dispatch({type:'Travel',scene});}
function paint(s:Sim,subject='window',style='warm'):Artwork {
 visit(s,'home');send(s,'paint',subject,{style});const w=s.state.life!.works.at(-1);expect(w).toBeDefined();close(s);return w!;
}
describe('seven days and the street market',()=>{
 it('starts at seven with a visible weekly goal and three focus',()=>{const s=new Sim(content,{originId:'normal',seed:123});expect(s.state.age).toBe(7);expect(s.state.life!.focus).toBe(3);send(s,'journal');expect(s.state.panel?.kind).toBe('Journal');expect(s.life.theme.name).toBe('街巷里的光');});
 it('requires visiting the subject and spends limited focus without selling the work',()=>{
  const s=make(),money=s.state.money;send(s,'paint','pond',{style:'ink'});expect(s.state.life!.works).toHaveLength(0);
  visit(s,'park');send(s,'explore','pond');expect(s.state.life!.subjects).toContain('pond');expect(s.state.life!.inspiration).toBe(2);close(s);
  const w=paint(s,'pond','ink');expect(w.status).toBe('stored');expect(s.state.money).toBe(money-6);expect(s.state.life!.focus).toBe(1);expect(s.state.life!.inspiration).toBe(1);
  paint(s);const count=s.state.life!.works.length;send(s,'paint','window',{style:'warm'});expect(s.state.life!.works).toHaveLength(count);
 });
 it('supports both branching commissions, accepts only one, and delivers only on the appointment day',()=>{
  for(const id of ['lin','ye']){
   const s=make(),scene=id==='lin'?'store':'book',subject=id==='lin'?'alley':'book',style=id==='lin'?'warm':'ink';
   visit(s,scene);send(s,'accept',id);close(s);visit(s,id==='lin'?'book':'store');send(s,'accept',id==='lin'?'ye':'lin');expect(s.state.life!.commission.id).toBe(id);
   visit(s,id==='lin'?'street':'book');send(s,'explore',subject);close(s);const w=paint(s,subject,style);expect(w.quality).toBeGreaterThanOrEqual(45);
   visit(s,scene);send(s,'deliver',id);expect(s.state.life!.commission.status).toBe('accepted');day(s);day(s);
   visit(s,scene);send(s,'deliver',id);expect(s.state.life!.commission.status).toBe('done');expect(w.status).toBe('gifted');
   const money=s.state.money;close(s);send(s,'deliver',id);expect(s.state.money).toBe(money);
  }
 });
 it('missed appointments persist as memories and cannot be submitted late',()=>{
  const s=make();visit(s,'store');send(s,'accept','lin');day(s);day(s);day(s);expect(s.state.life!.commission.status).toBe('missed');expect(s.state.life!.neighbors.lin.trust).toBe(6);expect(s.state.life!.neighbors.lin.memories.at(-1)).toContain('没有等到');visit(s,'store');send(s,'deliver','lin');expect(s.state.life!.commission.status).toBe('missed');
 });
 it('honors and remembers the preparation promise, and limits borrowing to outstanding principal',()=>{
  const s=make();s.state.clock=600;send(s,'promise','zhou');close(s);send(s,'help','zhou');expect(s.state.life!.focus).toBe(1);expect(s.state.life!.help).toBe('done');close(s);
  send(s,'borrow','zhou');const money=s.state.money;close(s);send(s,'borrow','zhou');expect(s.state.money).toBe(money);expect(s.state.life!.neighbors.zhou.loan).toBe(60);
  close(s);send(s,'repay','zhou');expect(s.state.life!.neighbors.zhou.loan).toBe(0);expect(s.state.money).toBe(money-60);
 });
 it('each work has only one owner and wall slots swap without losing paintings',()=>{
  const s=make(),a=paint(s),b=paint(s);send(s,'hang',a.id,{slot:0});close(s);send(s,'hang',b.id,{slot:0});expect(a.status).toBe('stored');expect(b.status).toBe('displayed');close(s);
  send(s,'sell',a.id);const money=s.state.money;close(s);send(s,'sell',a.id);expect(s.state.money).toBe(money);send(s,'reserve',a.id);expect(a.status).toBe('sold');
  const layout=copy(s.state.placed);day(s);expect(s.state.placed).toEqual(layout);expect(b.status).toBe('displayed');
 });
 it('gifts need an in-person visit, remember preferences, and produce a room keepsake',()=>{
  const s=make();visit(s,'book');send(s,'explore','book');close(s);const w=paint(s,'book','ink');send(s,'gift',w.id,{slot:2});expect(w.status).toBe('stored');visit(s,'book');send(s,'gift',w.id,{slot:2});expect(w.status).toBe('gifted');expect(s.state.life!.neighbors.ye.trust).toBe(27);expect(s.state.life!.keepsakes.map(k=>k.id)).toContain('ye');expect(s.state.life!.neighbors.ye.memories.at(-1)).toContain('旧书与信');
 });
 it('does not spend focus for maintenance and restores three focus each morning',()=>{
  const s=make();paint(s);s.effects(content.actions.shower);s.effects(content.actions.stove);expect(s.state.life!.focus).toBe(2);day(s);expect(s.state.life!.focus).toBe(3);expect(s.state.day).toBe(2);
 });
 it('enforces market opening day, previews customer acceptance, and settles once',()=>{
  const s=make(),w=paint(s);visit(s,'street');s.state.clock=700;send(s,'market');expect(s.state.life!.market.status).toBe('planning');close(s);for(let i=0;i<6;i++)day(s);
  visit(s,'street');s.state.clock=700;send(s,'market');expect(s.state.panel?.kind).toBe('Market');send(s,'price',undefined,{price:'friendly'});expect(s.life.quote(w).willBuy).toBe(true);send(s,'serve',w.id);expect(w.status).toBe('sold');const money=s.state.money;send(s,'serve',w.id);expect(s.state.money).toBe(money);expect(s.state.life!.market.round).toBe(1);send(s,'pass');send(s,'pass');expect(s.state.life!.market.status).toBe('complete');expect(s.state.life!.market.sold).toBe(1);expect(s.state.life!.keepsakes.map(k=>k.id)).toContain('market');
  const rep=s.state.stats.rep;close(s);send(s,'market');send(s,'leave');expect(s.state.stats.rep).toBe(rep);
 });
 it('allows missing the market, keeps unsold works, and carries consequences to the next week',()=>{
  const s=make();s.state.clock=600;send(s,'promise','zhou');close(s);send(s,'help','zhou');close(s);const w=paint(s);send(s,'hang',w.id,{slot:1});close(s);
  for(let i=0;i<7;i++)day(s);expect(s.state.panel?.kind).toBe('WeekRecap');expect(s.state.life!.market.status).toBe('missed');const house=s.state.house,placed=copy(s.state.placed);s.dispatch({type:'Continue'});
  expect(s.state.week).toBe(2);expect(s.state.age).toBe(19);expect(s.state.day).toBe(1);expect(s.state.life!.focus).toBe(3);expect(s.state.panel?.kind).toBe('Journal');expect(s.state.house).toBe(house);expect(s.state.placed).toEqual(placed);expect(w.status).toBe('displayed');expect(s.state.life!.keepsakes.map(k=>k.id)).toContain('zhou');expect(s.state.life!.followup).toContain('旧台灯');expect(s.life.theme.name).toBe('慢下来的风景');
 });
 it('survives summary, live-market and recap saves with deterministic outcomes',()=>{
  const svc=new SaveService(new MemoryDriver(),content,()=>123,()=> 'week-save'),s=make();paint(s);for(let i=0;i<6;i++)day(s);visit(s,'street');s.state.clock=700;send(s,'market');send(s,'price',undefined,{price:'friendly'});send(s,'serve',s.state.life!.works[0].id);
  const saved=svc.write(1,s.state,DEFAULT_SETTINGS),code=svc.export(saved),imported=svc.import(code,2),r=new Sim(content,{state:imported.state});expect(r.state).toEqual(s.state);send(r,'pass');send(s,'pass');send(r,'pass');send(s,'pass');expect(r.state).toEqual(s.state);day(r);expect(r.state.panel?.kind).toBe('WeekRecap');const recap=svc.write(3,r.state,DEFAULT_SETTINGS);expect(svc.parse(JSON.stringify(recap)).state.panel?.kind).toBe('WeekRecap');
 });
 it('rejects corrupt weekly ownership and recovers a valid backup',()=>{
  const svc=new SaveService(new MemoryDriver(),content,()=>123,()=> 'week-save'),s=make();paint(s);let saved=svc.write(1,s.state,DEFAULT_SETTINGS);saved=svc.write(1,s.state,DEFAULT_SETTINGS,saved);
  const bad=copy(saved);bad.state.life!.works.push(copy(bad.state.life!.works[0]));bad.checksum=checksum(JSON.stringify(bad.state));expect(()=>svc.parse(JSON.stringify(bad))).toThrow('corrupt');svc.driver.setSync('fs.slot.1',JSON.stringify(bad));expect(svc.load(1)!.state.life!.works).toHaveLength(1);
  expect(validLife({...s.state.life,focus:4})).toBe(false);
 });
 it('keeps legacy envelopes in classic mode rather than changing their age and day',()=>{
  const old=new Sim(content,{mode:'classic',seed:1});expect(old.state.life).toBeUndefined();const restored=new Sim(content,{state:copy(old.state)});day(restored);expect(restored.state.age).toBe(7);expect(restored.state.life).toBeUndefined();
 });
 it('cannot farm trust by repeatedly borrowing and immediately repaying',()=>{
  const s=make();s.state.clock=600;s.state.life!.neighbors.zhou.trust=30;
  for(let i=0;i<3;i++){send(s,'borrow','zhou');close(s);send(s,'repay','zhou');close(s);}
  expect(s.state.life!.neighbors.zhou.trust).toBe(30);expect(s.state.money).toBe(120);
 });
 it('closes at twenty even with customers remaining and preserves unsold works',()=>{
  const s=make(),w=paint(s);for(let i=0;i<6;i++)day(s);visit(s,'street');s.state.clock=1199;send(s,'market');send(s,'pass');expect(s.state.life!.market.status).toBe('complete');expect(s.state.life!.market.round).toBe(1);expect(w.status).toBe('stored');const money=s.state.money;send(s,'serve',w.id);expect(s.state.money).toBe(money);
 });
});

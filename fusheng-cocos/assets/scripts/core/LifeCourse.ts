import type { Sim } from './Sim';
import { clamp, Command, GameState, OriginDef, SkillKey } from './Types';

export type LifeStageId = 'child' | 'teen' | 'youth' | 'adult' | 'midlife';
export type CourseMetric = 'learning' | 'craft' | 'bonds' | 'vocation';
export type CourseDirection = 'none' | 'study' | 'create' | 'care' | 'work';
export type CourseMetrics = Record<CourseMetric, number>;
export interface CourseActivity { id: string; label: string; desc: string; metric: CourseMetric; amount: number; skill: SkillKey; focus: number; minutes: number; money: number; }
export interface LifeStage { id: LifeStageId; minAge: number; maxAge: number; name: string; home: string; goal: string; intro: string; yearGoal: string; commissionName: string; commissionHint: string; marketName: string; marketHint: string; activities: CourseActivity[]; }
export interface CourseChoice { id: string; label: string; hint: string; result: string; metric: CourseMetric; amount: number; direction: CourseDirection; }
export interface CourseMilestone { age: number; title: string; body: string; choices: CourseChoice[]; }
export interface LifeCourseContent { version: number; stages: LifeStage[]; milestones: CourseMilestone[]; copy: Record<string, string>; origins: Record<string, {name:string;desc:string}>; effectCopy: Record<string,string>; }
export interface CourseYear { age: number; stageId: LifeStageId; works: number; sold: number; metrics: CourseMetrics; choice: string; direction: CourseDirection; summary: string; }
export interface CourseState { version: 1; startedAge: number; completed: boolean; choices: Record<string, string>; metrics: CourseMetrics; activityDays: Record<string, number>; years: CourseYear[]; direction: CourseDirection; yearStart: CourseMetrics; yearStartSerial: number; }
export interface CourseCommand { type: 'Course'; action: 'open' | 'activity' | 'choose'; id?: string; }
const METRICS: CourseMetric[] = ['learning', 'craft', 'bonds', 'vocation'];
const DIRECTIONS: CourseDirection[] = ['none', 'study', 'create', 'care', 'work'];
const STAGES: LifeStageId[] = ['child', 'teen', 'youth', 'adult', 'midlife'];
const emptyMetrics = (): CourseMetrics => ({ learning: 0, craft: 0, bonds: 0, vocation: 0 });
export const createCourse = (age = 7, serial = 0): CourseState => ({ version: 1, startedAge: age, completed: false, choices: {}, metrics: emptyMetrics(), activityDays: {}, years: [], direction: 'none', yearStart: emptyMetrics(), yearStartSerial: serial });
export function validCourse(value: unknown): value is CourseState {
 const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
 const num = (v: unknown, min = 0, max = 1000000): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
 const metrics = (v: unknown): boolean => obj(v) && METRICS.every(k => num(v[k]));
 if (!obj(value) || value.version !== 1 || !num(value.startedAge, 7, 30) || typeof value.completed !== 'boolean' || !DIRECTIONS.includes(value.direction as CourseDirection) || !metrics(value.metrics) || !metrics(value.yearStart) || !num(value.yearStartSerial) || !obj(value.choices) || !obj(value.activityDays) || !Array.isArray(value.years) || value.years.length > 24) return false;
 if (Object.entries(value.choices).some(([age, id]) => !/^([7-9]|[12][0-9]|30)$/.test(age) || typeof id !== 'string' || !id.startsWith(age + '-') || id.length > 40)) return false;
 if (Object.entries(value.activityDays).some(([id, day]) => id.length > 40 || !num(day, 1))) return false;
 const ages = new Set<number>();
 for (const y of value.years) { if (!obj(y) || !num(y.age, 7, 30) || ages.has(y.age) || !STAGES.includes(y.stageId as LifeStageId) || !num(y.works) || !num(y.sold, 0, 3) || !metrics(y.metrics) || typeof y.choice !== 'string' || !DIRECTIONS.includes(y.direction as CourseDirection) || typeof y.summary !== 'string' || y.summary.length > 1000) return false; ages.add(y.age); }
 return !value.completed || ages.has(30);
}

export class LifeCourse {
 constructor(private readonly sim: Sim) {}
 get state(): GameState { return this.sim.state; }
 get data(): CourseState { return this.state.life!.course!; }
 get content(): LifeCourseContent { return this.sim.content['life-course']; }
 get stage(): LifeStage { return this.content.stages.find(p => this.state.age >= p.minAge && this.state.age <= p.maxAge) ?? this.content.stages[this.content.stages.length - 1]; }
 get origin(): OriginDef { const original = this.sim.content.origins.find(o => o.id === this.state.originId)!; return this.state.life ? { ...original, ...this.content.origins[original.id] } : original; }
 effectText(key: string): string { return this.state.life && this.state.age < 18 ? this.content.effectCopy[key.replace(/^@/, '')] ?? key : key; }
 get activities(): CourseActivity[] { return this.stage.activities; }
 get milestone(): CourseMilestone | undefined { return this.content.milestones.find(m => m.age === this.state.age && !this.data.choices[String(m.age)]); }
 get finished(): boolean { return !!this.state.life?.course?.completed; }
 text(key: string, params: Record<string, string | number | undefined> = {}): string { return (this.content.copy[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`)); }
 initialize(): void { if (this.state.life && !this.state.life.course) this.state.life.course = createCourse(this.state.age, this.state.life.serial); }
 beginYear(): void {
  if (!this.state.life) return;
  const s = this.state, l = s.life!, c = this.data;
  c.yearStart = { ...c.metrics }; c.yearStartSerial = l.serial;
  if (s.age < 18 && s.money < 40) { const amount = 40 - s.money; s.money = 40; l.followup += '\n' + this.text('course.support', { money: amount }); }
  if (s.age === 18) { s.money += 60; l.followup += '\n' + this.text('course.adultSupport'); }
  this.openYear();
 }
 openYear(): void { if (this.finished) this.showEnding(); else this.state.panel = this.milestone ? { kind: 'LifeChoice', id: String(this.state.age) } : { kind: 'Journal' }; this.sim.resetInput(); }
 private showEnding(): void { this.state.panel = { kind: 'LifeEnding', title: this.text('course.endingTitle'), body: this.text('course.endingBody') }; this.sim.resetInput(); }
 activityDone(id: string): boolean { return this.data.activityDays[id] === this.sim.life.dayIndex; }
 handle(command: Command): boolean {
  if (!this.state.life || command.type !== 'Course') return false;
  const s = this.state, c = this.data;
  if (this.finished) { this.showEnding(); return true; }
  if (s.dayEnded || s.action || (s.panel && !['LifeCourse', 'Journal', 'Reply', 'LifeChoice'].includes(s.panel.kind))) return true;
  if (command.action === 'open') { if (this.milestone) this.openYear(); else { s.panel = { kind: 'LifeCourse' }; this.sim.resetInput(); } return true; }
  if (command.action === 'choose') {
   if (s.panel?.kind !== 'LifeChoice') return true;
   const milestone = this.milestone, choice = milestone?.choices.find(x => x.id === command.id);
   if (!milestone || !choice) return true;
   c.choices[String(milestone.age)] = choice.id; c.metrics[choice.metric] += choice.amount; c.direction = choice.direction;
   this.note(choice.result); this.sim.need('fun', 8);
   s.panel = { kind: 'Reply', title: milestone.title, body: this.text('course.choiceResult', { result: choice.result, hint: choice.hint }) };
   return true;
  }
  if (s.panel?.kind !== 'LifeCourse' || this.milestone) return true;
  const a = this.activities.find(x => x.id === command.id);
  if (!a) return true;
  if (this.activityDone(a.id)) { this.sim.toast(this.text('course.activityDone')); return true; }
  if (s.life!.focus < a.focus) { this.sim.toast(this.text('course.focus')); return true; }
  if (s.clock + a.minutes >= this.sim.content.rules.endClock) { this.sim.toast(this.text('course.time')); return true; }
  s.life!.focus -= a.focus; s.clock += a.minutes; c.activityDays[a.id] = this.sim.life.dayIndex;
  const bonus = (c.direction === 'study' && a.metric === 'learning') || (c.direction === 'care' && a.metric === 'bonds') ? 1 : 0;
  const amount = a.amount + bonus, reward = a.money ? a.money + (c.direction === 'work' ? 10 : 0) : 0;
  c.metrics[a.metric] += amount; s.money += reward; s.stats.earned += reward;
  this.sim.xp(a.skill, 10 + (c.direction === 'create' && a.metric === 'craft' ? 4 : 0));
  if (a.metric === 'learning') s.growth.mind++;
  if (a.metric === 'bonds') { s.growth.charm++; s.rel.warm = clamp(s.rel.warm + 2); this.sim.need('food', 12); this.sim.need('clean', 12); }
  if (a.metric === 'vocation') s.stats.rep++;
  this.sim.need('energy', -4); this.sim.need('fun', 5);
  const result = this.text('course.activityResult', { activity: a.label, metric: this.text('metrics.' + a.metric), amount, reward: reward ? this.text('course.reward', { money: reward }) : '' });
  this.note(result); s.panel = { kind: 'Reply', title: a.label, body: result };
  return true;
 }
 private note(text: string): void { const s = this.state, l = s.life!; l.log.push(this.text('course.dayLog', { age: s.age, day: s.day, text })); l.log = l.log.slice(-32); }
 finishYear(): CourseYear {
  const s = this.state, l = s.life!, c = this.data, existing = c.years.find(y => y.age === s.age);
  if (existing) return existing;
  const metrics = emptyMetrics(); for (const key of METRICS) metrics[key] = Math.max(0, c.metrics[key] - c.yearStart[key]);
  const best = METRICS.reduce((a, b) => metrics[a] >= metrics[b] ? a : b), amount = metrics[best];
  let summary = s.age === 30 ? this.text('course.yearFinal') : amount ? this.text('course.yearActive', { metric: this.text('metrics.' + best), amount }) : this.text('course.yearQuiet');
  if (s.age === this.stage.maxAge && s.age !== 30) summary = this.text('course.yearBoundary', { stage: this.stage.name, summary });
  const year: CourseYear = { age: s.age, stageId: this.stage.id, works: Math.max(0, l.serial - c.yearStartSerial), sold: l.market.sold, metrics, choice: c.choices[String(s.age)] ?? '', direction: c.direction, summary };
  c.years.push(year); return year;
 }
 complete(): void { if (this.state.age !== 30 || this.state.day !== 7) return; this.finishYear(); this.data.completed = true; this.state.dayEnded = true; this.state.action = null; this.showEnding(); }
 yearText(year: CourseYear): string { const stage = this.content.stages.find(s => s.id === year.stageId)!; return this.text('course.yearOverview', { age: year.age, stage: stage.name, summary: year.summary, ...year.metrics, works: year.works, sold: year.sold }); }
}

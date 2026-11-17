import type { LifeCommand, LifeState } from './WeekLife';
import type { CourseCommand, LifeCourseContent } from './LifeCourse';
export type NeedKey='energy'|'food'|'clean'|'fun';
export type SkillKey='paint'|'cook'|'social';
export type Wealth='poor'|'mid'|'rich';
export type HouseId='villa'|'flat'|'rental';
export type SceneId='home'|'street'|'store'|'book'|'park';
export type RelKey='warm'|'trust'|'tension';
export type NeedValues=Record<NeedKey,number>;
export type Mods=Record<'income'|'warm'|'foodDecay'|'cookCost'|'paint',number>;
export interface Look {hair:string;cloth:string;skin:string;skirt:boolean;acc:string;scale:number;}
export interface CharacterDef extends Look {id:string;name:string;gender:string;tag:string;bonus:{skill?:SkillKey;need?:NeedKey;v?:number;warm?:number;money?:number};}
export interface OriginDef {id:string;name:string;diff:number;money:number;desc:string;needs:Partial<NeedValues>;skills:Partial<Record<SkillKey,number>>;rel:Partial<Record<RelKey,number>>;mods:Partial<Mods>;remove?:string[];extra?:string[];debt?:number;}
export interface CreedDef {id:string;name:string;desc:string;mods:Partial<Mods>;}
export interface Placed {furnitureId:string;x:number;y:number;}
export interface Segment {x1:number;x2:number;y:number;}
export interface HouseDef {id:HouseId;name:string;tierName:string;tier:number;x1:number;x2:number;roofY:number;f1:number;floors:number[];ladder:{x1:number;x2:number;top:number;bot:number}|null;doorX:number;windows:{x:number;y:number;w:number;h:number}[];labels:[string,number,number,number][];placed:Placed[];}
export interface FurnitureDef {name:string;w:number;h:number;price:number;buildable:boolean;use:{label:string;duration:number;actionId:string}|null;}
export type Expr=number|string|boolean|null|{op?:string;args?:Expr[];path?:string;variable?:string;random?:boolean;mod?:string};
export type Condition={type:'chance';p:number}|{type:'moneyBelow'|'moneyAtLeast'|'trustAtLeast';value:number}|{type:'hourBetween';from:number;to:number}|{type:'originIn';ids:string[]}|{type:'compare';left:Expr;op:string;right:Expr};
export type Effect=
 |{type:'money'|'warm';delta:Expr}|{type:'need';key:NeedKey;delta:Expr}|{type:'rel';key:RelKey;delta:Expr}
 |{type:'xp';skill:SkillKey;amount:Expr}|{type:'buff';nameKey:string;v:Expr;a:Expr;hours:Expr}
 |{type:'task';key:string;amount:Expr}|{type:'clock';minutes:Expr}|{type:'flag';key:'story.fair';value:boolean}
 |{type:'stat';key:'paintings'|'meals'|'earned'|'rep';delta:Expr}|{type:'reply';whoKey:string;textKey:string}
 |{type:'toast';textKey:string}|{type:'travel';scene:SceneId;x:number|null}|{type:'action';id:string}
 |{type:'sleep'|'paint'|'stop'}|{type:'let';key:string;value:Expr}
 |{type:'branch';condition:Condition;then:Effect[];else:Effect[]};
export interface OptionDef {id:string;label:string;hint:string;effects:Effect[];}
export interface NarrativeDef {id:string;title:string;body:string;sub:string;seal:string;weight:number;where:SceneId|null;day:number|null;conditions:Condition[];bodyVariants?:{conditions:Condition[];body:string}[];options:OptionDef[];}
export interface TaskDef {key:string;text:string;short:string;need:number;requires:string|null;}
export interface Task extends TaskDef {done:boolean;}
export interface SceneDecor {kind:'shelf'|'table'|'chair'|'counter';x:number;y:number;w:number;h:number;}
export interface SceneDef {ladder?:HouseDef['ladder'];decor?:SceneDecor[];id:SceneId;name:string;outdoor?:boolean;indoor?:boolean;floors:Segment[];spawn:{x:number;y:number};props:{id:string;x:number;y:number;w:number;h:number;label:string;effects:Effect[]}[];}
export interface Content {'life-course':LifeCourseContent;origins:OriginDef[];characters:CharacterDef[];creeds:CreedDef[];houses:Record<string,HouseDef>;furniture:Record<string,FurnitureDef>;tasks:TaskDef[];skills:{id:SkillKey;name:string}[];scenes:Record<string,SceneDef>;events:NarrativeDef[];twists:NarrativeDef[];story:NarrativeDef[];npc:{x:number;y:number;name:string;title:string;body:string;sub:string;options:OptionDef[]};actions:Record<string,Effect[]>;prologue:Record<string,{v:number;lines:string[];final?:boolean}[]>;'paint-titles':string[];rules:typeof import('../../../content/rules.json');i18n:Record<string,string>;ui:Record<string,string>;}
export type PanelKind='Origin'|'DaySummary'|'Birthday'|'Story'|'Event'|'Twist'|'Reply'|'Legacy'|'Journal'|'Collection'|'Artwork'|'Compose'|'Neighbor'|'Market'|'WeekRecap'|'RestConfirm'|'LifeCourse'|'LifeChoice'|'LifeEnding';
export interface SimPanel {kind:PanelKind;id?:string;title?:string;body?:string;data?:Record<string,string|number|boolean>;}
export interface GameState {introSeen?:boolean;life?:LifeState;charId:string;look:Look;house:HouseId;wealth:Wealth;scene:SceneId;originId:string;creedId:string|null;gen:number;age:number;week:number;day:number;clock:number;money:number;growth:{body:number;mind:number;charm:number};needs:NeedValues;skills:Record<SkillKey,{lv:number;xp:number}>;rel:Record<RelKey,number>;buffs:{nameKey:string;v:number;a:number;until:number}[];tasks:Task[];taskProg:Record<string,number>;placed:Placed[];stats:{paintings:number;meals:number;earned:number;rep:number};story:{seen:Record<string,boolean>;fair:boolean};twist:{id:string;week:number;day:number;fired:boolean}|null;dayStart:{money:number;needs:NeedValues};player:{x:number;y:number;vy:number;facing:number;moving:boolean;grounded:boolean;climbing:boolean};action:{furnitureId:string;x:number;y:number;elapsed:number;duration:number}|null;eventsToday:number;dayEnded:boolean;panel:SimPanel|null;rng:number;}
export interface GameSettings {speed:1|2|4;musicVolume:number;sfxVolume:number;fontScale:1|1.15|1.3;reduceMotion:boolean;}
export type Command=CourseCommand|LifeCommand|{type:'FinishPrologue'}|{type:'Move';x:number;y:number}|{type:'Jump'}|{type:'Interact'}|{type:'Travel';scene:SceneId;x?:number}|{type:'ChooseOption';id:string}|{type:'Continue'}|{type:'Sleep'}|{type:'PlaceFurniture';furnitureId:string;x:number;y:number}|{type:'RemoveFurniture';x:number;y:number}|{type:'Legacy';creedId:string};
export type SimEvent={type:'Toast';key:string;params?:Record<string,string|number>}|{type:'SaveRequested';reason:string}|{type:'PanelChanged'}|{type:'NeedChanged';needs:NeedValues}|{type:'ActionStarted'|'ActionFinished'|'SceneChanged'|'DayEnded'|'WeekAdvanced'|'Moved'|'TimeChanged'};
export interface Near {kind:'furniture'|'npc'|'door'|'prop';id:string;x:number;y:number;label:string;}
export const NEED_KEYS:NeedKey[]=['energy','food','clean','fun'];
export const SKILL_KEYS:SkillKey[]=['paint','cook','social'];
export const REL_KEYS:RelKey[]=['warm','trust','tension'];
export const clamp=(v:number,a=0,b=100):number=>Math.max(a,Math.min(b,v));
export const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;

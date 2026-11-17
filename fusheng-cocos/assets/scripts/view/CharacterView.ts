import { _decorator, Component, Graphics, Node, UITransform, Layers } from 'cc';
import { ArtAssets } from './ArtAssets';
import { Sim } from '../core/Sim';
import { Look } from '../core/Types';
import { I18n } from '../data/I18n';
import { InkPainter } from './InkPainter';
import { renderArt } from './ArtGeometry';
const {ccclass}=_decorator;
export type CharacterAnimation='idle'|'walk'|'climb_up'|'climb_down'|'jump'|'sit'|'sleep'|'cook'|'shower'|'paint'|'tv'|'read'|'water'|'tea'|'wardrobe'|'talk'|'carry'|'tired'|'celebrate';
export interface CharacterAnimator {setAnimation(state:CharacterAnimation,loop:boolean):void;setLook(look:Look,stage:string):void;}
@ccclass('CharacterView')
export class CharacterView extends Component {
 private ink!:Graphics;private time=0;private redraw=0;private px=0;private py=0;private initialized=false;
 private animator:CharacterAnimator|null=null;private spriteKey='';private body!:Node;
 attachSpine(animator:CharacterAnimator):void{this.animator=animator;}
 setup():void{this.node.layer=Layers.Enum.UI_2D;(this.node.getComponent(UITransform)??this.node.addComponent(UITransform)).setContentSize(100,140);this.ink=this.node.addComponent(Graphics);this.body=new Node('InkCharacterSprite');this.body.layer=Layers.Enum.UI_2D;this.node.addChild(this.body);this.body.addComponent(UITransform).setAnchorPoint(.5,0);}
 present(sim:Sim,i18n:I18n,dt:number,npc=false,portraitLook?:Look):void{const s=sim.state;const targetX=npc?sim.content.npc.x:portraitLook?0:s.player.x,targetY=npc?sim.house.f1:portraitLook?0:s.player.y;if(!this.initialized){this.px=targetX;this.py=targetY;this.initialized=true;}const t=1-Math.exp(-dt*30);this.px+=(targetX-this.px)*t;this.py+=(targetY-this.py)*t;this.node.setPosition(this.px,-this.py-6);this.time+=dt;this.redraw-=dt;if(this.redraw>0)return;this.redraw=.1;
 const id=s.action?.furnitureId;const state:CharacterAnimation=npc?'talk':s.player.climbing?'climb_up':!s.player.grounded?'jump':id?({bed:'sleep',stove:'cook',fridge:'carry',sofa:'sit',tv:'tv',easel:'paint',desk:'read',plant:'water',bookshelf:'read',wardrobe:'wardrobe',shower:'shower',tea:'tea'} as Record<string,CharacterAnimation>)[id]??'idle':s.player.moving?'walk':s.needs.energy<25?'tired':'idle';
 if(this.animator){this.animator.setLook(s.look,sim.stage);this.animator.setAnimation(state,true);return;}
 const assetId=portraitLook?(sim.content.characters.find(c=>c.hair===portraitLook.hair&&c.cloth===portraitLook.cloth)?.id??s.charId):npc?'npc':s.charId;
 // The course begins in childhood. Teenagers grow toward the adult silhouette;
 // thirty is the first middle-life chapter and does not imply grey hair.
 const stage=npc?'young':portraitLook||s.age<=12?'kid':'young';
 const bodyScale=npc||portraitLook?1:s.age<=12?.91+(s.age-7)*.018:s.age<18?.86+(s.age-13)*.028:s.age>=30?1.025:1;
 this.body.setScale(bodyScale,bodyScale,1);
 const walking=s.player.moving&&!npc;const frame=(npc||!portraitLook&&s.player.facing<0?16:0)+(walking?8:0)+(portraitLook?0:Math.floor(this.time*13/(Math.PI*2)*8)%8);
 const key=assetId+'-'+stage+':'+frame;
 this.node.getComponent(UITransform)!.setAnchorPoint(.5,0);this.node.setPosition(this.px,-this.py-6);
 if(this.spriteKey!==key){this.spriteKey=key;void ArtAssets.character(this.body,assetId+'-'+stage,frame);}
 this.node.angle=state==='sleep'?75:state==='tired'?-7:0;
 this.ink.clear();
 const pen=new InkPainter(this.node,this.ink,i18n);
 if(state==='shower'){pen.strokeStyle='#8ca3ab';pen.globalAlpha=.7;pen.lineWidth=1.4;for(let i=0;i<10;i++){const x=-22+(i%5)*11,y=-90+(this.time*30+i*13)%75;pen.beginPath();pen.moveTo(x,y);pen.lineTo(x-2,y+6);pen.stroke();}}
 if(state==='cook'||state==='tea'){pen.strokeStyle='#9d9687';pen.globalAlpha=.5;for(let i=0;i<3;i++){pen.beginPath();pen.moveTo(12+i*7,-55);pen.quadraticCurveTo(22+i*7,-65,13+i*7,-78-Math.sin(this.time*3)*3);pen.stroke();}}
 }
}

export type SceneResident='lin'|'ye'|'visitorSage'|'visitorOchre';

// Residents use the same authored ink figure as the character atlas, with their
// own appearance. A stationary scene snapshot prevents the player's action or
// movement from making a shopkeeper walk, paint, or carry something as well.
export function drawSceneResident(node:Node,sim:Sim,i18n:I18n,resident:SceneResident,facing=-1):void {
 const looks:Record<SceneResident,Partial<Look>&{stage:string;hairColor:string}>={
  lin:{stage:'young',hair:'short',cloth:'#9ba99a',skin:'#f0e4d1',scale:1,skirt:false,acc:'none',hairColor:'#3c3b34'},
  ye:{stage:'mid',hair:'curl',cloth:'#a8a9b5',skin:'#f0e4d1',scale:.96,skirt:true,acc:'glasses',hairColor:'#d6d3c6'},
  visitorSage:{stage:'young',hair:'pony',cloth:'#a4b3a1',skin:'#f4e7d5',scale:.96,skirt:true,acc:'none',hairColor:'#50483e'},
  visitorOchre:{stage:'young',hair:'short',cloth:'#c5b28e',skin:'#eadbc3',scale:1.02,skirt:false,acc:'none',hairColor:'#4b4940'},
 };
 const snapshot=Object.assign(Object.create(sim) as Sim,{state:{...sim.state,action:null,player:{...sim.state.player,facing,moving:false}}});
 const graphics=node.addComponent(Graphics);
 renderArt(new InkPainter(node,graphics,i18n),snapshot,i18n,'person',undefined,0,looks[resident]);
}

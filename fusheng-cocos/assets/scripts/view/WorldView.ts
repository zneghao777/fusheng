import { drawBookshop } from './BookshopView';
import { drawArtwork } from './ArtworkView';
import { Color, Graphics, Layers, Node, Sprite, UITransform, UIOpacity, Vec3 } from 'cc';
import { Sim } from '../core/Sim';
import { I18n } from '../data/I18n';
import { UIFactory } from '../ui/UIFactory';
import { ArtAssets } from './ArtAssets';
import { CharacterView } from './CharacterView';
import { drawSceneDetails } from './SceneDetails';
export class WorldView {
 readonly node:Node;private background:Node;private furniture:Node;private bookshop:Node;private player:CharacterView;private npc:CharacterView;private tint:Node;private hash='';private backdrop='';private glows:Node;private shadeAlpha=-1;
 private horizontalCompensation=1;
 setHorizontalCompensation(value:number):void{this.horizontalCompensation=value;}
 private entryPositions=new Map<Node,Vec3>();
 constructor(parent:Node,private readonly ui:UIFactory,private readonly i18n:I18n,private sim:Sim){
  this.node=new Node('World');this.node.layer=Layers.Enum.UI_2D;parent.addChild(this.node);this.node.setPosition(-640,360);this.node.addComponent(UITransform).setContentSize(1280,720);
  this.background=this.child('OriginalInkScenery');this.background.setPosition(640,-360);
  this.bookshop=this.child('BookshopLayer');this.bookshop.active=false;this.furniture=this.child('FurnitureLayer');const chars=this.child('CharacterLayer');const player=this.child('PlayerCharacter',chars);this.player=player.addComponent(CharacterView);this.player.setup();const npc=this.child('NpcCharacter',chars);this.npc=npc.addComponent(CharacterView);this.npc.setup();
  this.tint=this.child('LightLayer');const g=this.tint.addComponent(Graphics);g.fillColor=new Color('#1e263c');g.rect(0,-720,1280,720);g.fill();this.glows=this.child('WarmLightGlows');this.glows.addComponent(UIOpacity);
 }
 private lights():void{
  const s=this.sim.state,h=this.sim.house;
  const light=(x:number,y:number,r:number)=>{const n=this.child('PaperLight',this.glows);n.setPosition(x,-y);void ArtAssets.paint(n,'ui/glow',r*2,r*2);};
  if(s.scene==='home'){for(const f of s.placed)if(['lamp','tv','stove'].includes(f.furnitureId))light(f.x,f.y-(f.furnitureId==='lamp'?16:38),f.furnitureId==='lamp'?170:120);light((h.x1+h.x2)/2,h.f1-110,280);}
  if(s.scene==='street'){light(230,470,150);light(900,470,150);light(330,540,120);light(720,540,120);}
  if(s.scene==='store')for(let i=0;i<3;i++)light(280+i*300,180,240);
  if(s.scene==='book'){light(650,203,180);light(740,428,180);}
  if(s.scene==='park'){light(230,470,170);light(950,600,200);}
 }

 private weeklyScenery():void {
  const s=this.sim.state,l=s.life!,house=this.sim.house;
  if(s.scene==='home'){
   for(const work of l.works.filter(w=>w.status==='displayed')){
    const n=this.child('Artwork_'+work.id,this.furniture),floor=house.floors[Math.min(1,house.floors.length-1)],ceiling=house.floors[2]??house.roofY;
    n.setPosition(house.x1+(house.x2-house.x1)*(.35+(work.slot??0)*.2),-Math.max(floor-154,ceiling+44));drawArtwork(n,work,88,66);
   }
   l.keepsakes.filter(k=>k.displayed).forEach((k,i)=>{const n=this.child('Keepsake_'+k.id,this.furniture);n.setPosition(house.x1+100+i*75,-Math.max(house.f1-160,(house.floors[1]??house.roofY)+44));this.drawKeepsake(n,k.id);});
  }
 }
 private drawKeepsake(n:Node,id:string):void {
  const g=n.addComponent(Graphics),ink=new Color('#796d59');
  const box=(x:number,y:number,w:number,h:number,color:string)=>{g.fillColor=new Color(color);g.rect(x,y,w,h);g.fill();};
  g.strokeColor=ink;g.lineWidth=2;g.moveTo(-30,-22);g.lineTo(30,-22);g.moveTo(-19,-22);g.lineTo(-19,-29);g.moveTo(19,-22);g.lineTo(19,-29);g.stroke();
  if(id==='zhou'){
   g.moveTo(0,-19);g.lineTo(0,12);g.moveTo(-12,-19);g.lineTo(12,-19);g.stroke();
   g.fillColor=new Color('#e9dfc1');g.moveTo(-16,9);g.lineTo(-10,25);g.lineTo(10,25);g.lineTo(16,9);g.close();g.fill();g.stroke();
  }else if(id==='ye'){
   box(-23,-20,46,38,'#a28c6d');box(-19,-16,38,30,'#eee7d7');box(-15,-12,30,22,'#d7dccc');
   g.moveTo(-12,-8);g.lineTo(0,4);g.lineTo(12,-8);g.stroke();
  }else if(id==='lin'){
   box(-20,-20,40,22,'#b6aa8b');box(-17,-15,34,13,'#e7dbc4');
   for(let i=0;i<4;i++){box(-14+i*8,-10,5,16,['#b57866','#91a390','#c5ad73','#888b9d'][i]);}
  }else{
   box(-23,-20,46,34,'#b69b75');box(-19,-16,38,26,'#d8c49f');
   g.lineWidth=1;for(let i=0;i<3;i++){g.moveTo(-12,3-i*6);g.lineTo(10-i*3,3-i*6);}g.stroke();box(11,-13,5,6,'#a95643');
  }
 }
 private child(name:string,parent=this.node):Node{const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.addComponent(UITransform).setContentSize(1280,720);return n;}
 get ready():boolean{return !!this.background.getComponent(Sprite)?.spriteFrame&&this.furniture.children.filter(n=>n.name.startsWith('Furniture_')).every(n=>!!n.getComponent(Sprite)?.spriteFrame)&&!!this.player.node.getChildByName('InkCharacterSprite')?.getComponent(Sprite)?.spriteFrame;}
 unfold(progress:number):void{
  const ease=(v:number)=>1-Math.pow(1-Math.max(0,Math.min(1,v)),3),wall=ease((progress-.08)/.46),floor=this.sim.house.f1;
  this.background.setScale(1,Math.max(.015,wall),1);this.background.setPosition(640,-floor+(floor-360)*wall);
  this.furniture.children.forEach((n,i)=>{if(!this.entryPositions.has(n))this.entryPositions.set(n,n.position.clone());const p=ease((progress-.28-Math.min(i,15)*.015)/.34);n.setScale(1,Math.max(.001,p),1);n.setPosition(this.entryPositions.get(n)!);});
  const alpha=ease((progress-.76)/.16)*255;
  for(const n of [this.player.node,this.npc.node]){const opacity=n.getComponent(UIOpacity)??n.addComponent(UIOpacity);opacity.opacity=alpha;}
  this.tint.active=progress>.9;this.glows.active=progress>.9;
 }
 setSim(sim:Sim):void{this.sim=sim;this.hash='';}
 rebuild():void{this.hash='';this.backdrop='';}
 update(dt:number):void{
  const s=this.sim.state,hour=s.clock/60,hourKey=hour<5||hour>=20?22:hour>=17?18:7;
  const path='scenes/'+(s.scene==='home'?'home-'+s.house:s.scene)+'-'+hourKey;
  if(path!==this.backdrop){this.backdrop=path;this.bookshop.active=s.scene==='book';this.ui.clear(this.bookshop);if(s.scene==='book')drawBookshop(this.bookshop,this.ui,this.sim.content.scenes.book);void ArtAssets.paint(this.background,s.scene==='book'?'ui/paper':path,1280,720);}
  const hash=s.house+':'+s.scene+':'+(this.sim.content.scenes[s.scene]?.outdoor&&this.sim.darkness()>.2)+':'+JSON.stringify(s.placed)+':'+JSON.stringify(s.life?{works:s.life.works.filter(w=>w.status==='displayed'||w.status==='reserved'),keepsakes:s.life.keepsakes,day:s.day,market:s.life.market.status,marketHours:s.scene==='street'&&s.day===7?(s.clock<600?'setup':s.clock<1200?'open':'closed'):''}:null);
  if(hash!==this.hash){this.hash=hash;this.entryPositions.clear();this.ui.clear(this.furniture);this.ui.clear(this.glows);this.lights();if(s.scene==='home')for(const f of s.placed.slice().sort((a,b)=>a.y-b.y)){
   const d=this.sim.content.furniture[f.furnitureId],n=this.child('Furniture_'+f.furnitureId,this.furniture);n.setPosition(f.x,-f.y-12);n.getComponent(UITransform)!.setAnchorPoint(.5,0);
   void ArtAssets.paint(n,'furniture/'+f.furnitureId,d.w+32,d.h+28);
  }drawSceneDetails(this.furniture,this.ui,this.sim,this.i18n);if(s.life)this.weeklyScenery();}
  this.player.present(this.sim,this.i18n,dt);this.player.node.setScale(this.horizontalCompensation,1,1);this.npc.node.setScale(this.horizontalCompensation,1,1);for(const n of this.furniture.children)n.setScale(this.horizontalCompensation,1,1);this.npc.node.active=s.scene==='home'&&this.sim.npcActive();if(this.npc.node.active)this.npc.present(this.sim,this.i18n,dt,true);const alpha=Math.round(this.sim.darkness()*255);if(alpha!==this.shadeAlpha){this.shadeAlpha=alpha;const shade=this.tint.getComponent(Graphics)!;shade.clear();shade.fillColor=new Color(30,38,60,alpha);shade.rect(0,-720,1280,720);shade.fill();}this.glows.getComponent(UIOpacity)!.opacity=alpha;
 }
}

import { Color, Graphics, HorizontalTextAlignment, Node, UITransform, Layers } from 'cc';
import { Sim } from '../core/Sim';
import { I18n } from '../data/I18n';
import { SceneDef } from '../core/Types';
import { UIFactory } from '../ui/UIFactory';
import { drawArtwork } from './ArtworkView';
import { drawSceneResident, SceneResident } from './CharacterView';

const INK='#68665b', PAPER='#f5eddb', RED='#a6402f', WOOD='#b7a184';
type SceneProp=SceneDef['props'][number];

// These details share the interaction coordinates in scenes.json. The scene
// remains walkable; scenery carries no input-blocking components or colliders.
export function drawSceneDetails(parent:Node,ui:UIFactory,sim:Sim,i18n:I18n):void {
 const state=sim.state,scene=sim.content.scenes[state.scene];
 if(!scene)return;
 const make=(name:string,x:number,y:number)=>{const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.setPosition(x,-y);n.addComponent(UITransform);return n;};
 const line=(g:Graphics,x:number,y:number,xx:number,yy:number,width=2,color=INK)=>{g.strokeColor=new Color(color);g.lineWidth=width;g.moveTo(x,-y);g.lineTo(xx,-yy);g.stroke();};
 const box=(g:Graphics,x:number,y:number,w:number,h:number,color:string)=>{g.fillColor=new Color(color);g.rect(x,-y-h,w,h);g.fill();};
 const dark=!!scene.outdoor&&sim.darkness()>.2;
 const sign=(key:string,x:number,y:number,w=106,h=26)=>ui.sceneLabel(parent,key,x,-y,w,h,dark);
 const marker=(p:SceneProp)=>{const n=make('InteractionThreshold_'+p.id,p.x,p.y),g=n.addComponent(Graphics);line(g,-11,-1,11,-1,.9,'#a6402f66');};
 const prop=(id:string)=>scene.props.find(p=>p.id===id)!;
 const resident=(id:SceneResident,x:number,y:number,facing=-1)=>{const n=make('Resident_'+id,x,y);drawSceneResident(n,sim,i18n,id,facing);};
 const door=(p:SceneProp,key:string)=>{
  const n=make('SceneExit_'+p.id,p.x,p.y),g=n.addComponent(Graphics);
  box(g,-31,-112,62,112,'#e1d4be');box(g,-25,-105,50,98,'#f7f0e3');
  line(g,-31,-112,-31,0,2.5);line(g,-31,-112,31,-112,2.5);line(g,31,-112,31,0,2.5);
  line(g,-20,-99,-20,-15,1,'#c5b69b');g.fillColor=new Color(RED);g.circle(19,54,3);g.fill();
  line(g,-11,-57,10,-57,2.5,RED);line(g,-11,-57,-4,-64,2.5,RED);line(g,-11,-57,-4,-50,2.5,RED);
  sign(key,p.x,p.y-138,110);marker(p);
 };

 if(state.scene==='street'){
  const home=prop('street_0'),store=prop('street_1'),book=prop('street_2'),park=prop('street_3');
  // Strengthen existing thresholds rather than introducing remote map buttons.
  for(const p of [home,store,book,park])marker(p);
  for(const p of [store,book]){
   const n=make('ShopEntrance_'+p.id,p.x,p.y),g=n.addComponent(Graphics);
   box(g,-24,-96,48,96,'#eee6d790');line(g,-24,-96,-24,-1,1.7);line(g,24,-96,24,-1,1.7);line(g,-24,-96,24,-96,1.7);
   line(g,10,-48,10,-36,2,RED);
  }
  sign('scene.enterHome',home.x,home.y-160,88);
  sign('scene.enterStore',store.x,store.y-150,98);
  sign('scene.enterBook',book.x,book.y-150,98);
  sign('scene.enterPark',park.x,park.y-96,88);
  if(state.life){
   const notice=prop('street_notice'),sketch=prop('street_sketch');
   const board=make('NeighborhoodNotice',notice.x,notice.y),g=board.addComponent(Graphics);
   box(g,-30,-96,60,78,'#e7ddc7bc');line(g,-30,-96,30,-96,.9,'#a49375');
   line(g,-24,-18,-24,0,1.5,WOOD);line(g,24,-18,24,0,1.5,WOOD);
   const note=ui.display(board,'scene.notice',0,65,52,44,ui.touch?16:12,HorizontalTextAlignment.CENTER);note.lineHeight=ui.touch?20:17;note.color=new Color('#62553f');
   g.fillColor=new Color('#a6402f8c');g.circle(0,90,1.8);g.fill();
   for(let i=0;i<2;i++){line(g,-17,-37+i*7,17-i*8,-37+i*7,.7,'#b5a484');}
   marker(notice);
   const easel=make('AlleySketch',sketch.x,sketch.y),eg=easel.addComponent(Graphics);
   line(eg,-29,0,-7,-94,3,WOOD);line(eg,29,0,7,-94,3,WOOD);line(eg,-31,-25,31,-25,3,WOOD);
   box(eg,-26,-86,52,51,PAPER);line(eg,-19,-44,-7,-61,1.5);line(eg,-7,-61,3,-52,1.5);line(eg,3,-52,18,-73,1.5);
   eg.fillColor=new Color('#b8bdac');eg.circle(12,75,5);eg.fill();
   sign('scene.sketch',sketch.x,sketch.y-114,100);marker(sketch);
   const market=prop('street_market'),closed=['complete','missed'].includes(state.life.market.status)||(state.day===7&&state.clock>=1200);
   if(state.day===7&&!closed){
    const n=make('SundayMarket',market.x,market.y),sg=n.addComponent(Graphics);
    // A narrow stall fits between the bookshop and park without hiding either.
    for(const x of [-70,70])line(sg,x,-133,x,0,3,WOOD);
    box(sg,-78,-135,156,20,'#d7bba2');
    for(let i=0;i<6;i++)box(sg,-78+i*26,-135,26,20,i%2?'#e8ddc2':'#b17c65');
    line(sg,-78,-135,78,-135,2);line(sg,-78,-115,78,-115,2);
    box(sg,-63,-32,126,10,'#bda584');box(sg,-59,-22,118,22,'#d7c6a8');
    sign(state.clock<600?'scene.marketPreparing':'scene.market',market.x,market.y-151,128);
    const works=state.life.works.filter(w=>w.status==='reserved').slice(0,3);
    works.forEach((w,i)=>{const x=-46+i*46;line(sg,x,-112,x,-91,1,'#96856b');const art=make('MarketArtwork_'+w.id,market.x+x,market.y-69);drawArtwork(art,w,38,36);});
    if(!works.length)sign('scene.marketInvitation',market.x,market.y-78,116);
    if(state.clock>=600){resident('visitorSage',market.x-92,market.y,1);resident('visitorOchre',market.x+90,market.y,-1);}
    marker(market);
   }else{
    const n=make('MarketDays',market.x,market.y),mg=n.addComponent(Graphics);line(mg,0,0,0,-61,1.5,WOOD);
    sign(closed?'scene.marketClosed':'scene.marketSoon',market.x,market.y-80,128);marker(market);
   }
  }
 }

 if(state.scene==='park'){
  door(prop('park_0'),'scene.exitAlley');
  const tree=prop('park_1'),pigeons=prop('park_2'),pond=prop('park_3');
  sign(state.life?'scene.treeStudy':'scene.bench',tree.x,tree.y-96,116);marker(tree);
  sign('scene.pigeons',pigeons.x,pigeons.y-65,106);marker(pigeons);
  sign(state.life?'scene.pondStudy':'scene.pond',pond.x,pond.y-91,116);marker(pond);
 }

 if(state.scene==='store'){
  door(prop('store_0'),'scene.exitAlley');
  const food=prop('store_1'),drink=prop('store_2'),lin=prop('store_3');
  sign('scene.food',food.x,food.y-food.h-26,110);marker(food);
  sign('scene.drinks',drink.x,drink.y-drink.h-26,110);marker(drink);
  resident('lin',lin.x,lin.y-48);sign('scene.lin',lin.x,lin.y-157,106);
  // The clerk stands behind the existing counter; its front covers the legs.
  const front=make('StoreCounterFront',lin.x,lin.y),g=front.addComponent(Graphics);
  box(g,-80,-90,160,90,'#e9dfca');line(g,-84,-90,84,-90,4,WOOD);line(g,-80,-90,-80,0,2);line(g,80,-90,80,0,2);line(g,-80,-10,80,-10,1,'#c0b292');marker(lin);
 }

 if(state.scene==='book'){
  const ye=prop('book_3');resident('ye',ye.x-15,ye.y-43);sign('scene.ye',ye.x-8,ye.y-153,106);
  const front=make('BookCounterFront',ye.x,ye.y),g=front.addComponent(Graphics);
  box(g,-67,-86,134,86,'#e6dbc4');line(g,-71,-86,71,-86,4,WOOD);line(g,-67,-86,-67,0,2);line(g,67,-86,67,0,2);line(g,-67,-10,67,-10,1,'#c0b292');marker(ye);
 }
}

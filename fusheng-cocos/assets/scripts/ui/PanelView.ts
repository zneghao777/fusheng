import { Color, HorizontalTextAlignment, Label, Node, ScrollView, UITransform, Vec2, VerticalTextAlignment } from 'cc';
import { drawArtwork } from '../view/ArtworkView';
import type { PanelPresentation } from './WeekPanels';
import { panelPage } from './PanelLayout';
import { UIButton, UIFactory } from './UIFactory';
import { UI_COLORS as C } from './UITokens';

export interface PanelAction {key:string;run:()=>void;params?:Record<string,string|number>;primary?:boolean;}
export interface PanelOptions {
 kind:string;title:string;body:string;actions:PanelAction[];close?:()=>void;
 previewHeight?:number;presentation?:PanelPresentation;fontScale:number;reduceMotion:boolean;
 buttonsChanged:(buttons:UIButton[])=>void;
}

/** Reading, choice and collection surfaces share controls, not a fixed column ratio. */
export function renderPanel(ui:UIFactory,parent:Node,touch:boolean,o:PanelOptions):{
 node:Node;scroll:ScrollView;preview:{x:number;y:number;width:number;height:number};
}{
 const presentation=o.presentation,previewHeight=o.previewHeight??0;
 const actions=o.actions.filter(a=>!presentation?.gallery?.some(item=>item.run===a.run));
 const actionText=actions.map(a=>ui.i18n.plain(a.key,a.params));
 const rich=!!presentation,choices=!rich&&(actions.length>3||actionText.some(text=>text.includes('\n')||text.length>36));
 const short=!rich&&!choices&&!previewHeight&&actions.length<=2&&o.body.length<190;
 const w=short?(touch?832:700):(touch?1120:1040),pad=touch?32:36;
 const header=touch?94:86,gap=12,font=(touch?28:20)*o.fontScale,actionFont=(touch?26:18)*o.fontScale,actionLine=Math.ceil(actionFont*1.3);
 const textHeight=(body:string,width:number,size=font,lineHeight=size*1.5)=>body.split('\n').reduce((total,row)=>total+Math.max(1,Math.ceil(row.length/Math.max(1,Math.floor(width/size))))*lineHeight,0);
 const actionWidth=choices?(touch?382:330):w-pad*2;
 const footerCols=Math.max(1,Math.min(3,actions.length)),footerButtonWidth=Math.min((w-pad*2-gap*(footerCols-1))/footerCols,short?(touch?260:220):!rich&&actions.length===1?(touch?320:260):Infinity);
 const requiredActionHeight=Math.max(0,...actionText.map(text=>textHeight(text,(choices?actionWidth:footerButtonWidth)-24,actionFont,actionLine)+24));
 let buttonH=Math.max(touch?88:52,requiredActionHeight);
 const pagerH=touch?88:56,pagerSpace=pagerH+44;
 const h=short?Math.min(620,Math.max(touch?360:320,header+pad+buttonH+32+textHeight(o.body,w-pad*2)+16)):(touch?632:620);
 let footerRows=rich?Math.min(2,Math.max(1,Math.ceil(actions.length/footerCols))):1;
 if(!choices&&footerRows>1&&footerRows*(buttonH+gap)+20+(actions.length>footerRows*footerCols?pagerSpace:0)>h-header-previewHeight-pad-160)footerRows=1;
 const limit=choices?Math.max(1,Math.min(4,Math.floor((h-header-pad-pagerSpace-gap)/(Math.min(buttonH,h-header-pad-pagerSpace-gap)+gap)))):footerRows*footerCols;
 const paged=actions.length>limit;
 // Unusually long footer copy may shrink inside its own button, never into the reading area.
 if(!choices)buttonH=Math.min(buttonH,Math.max(touch?88:52,(h-header-previewHeight-pad-160-20-(paged?pagerSpace:0))/footerRows-gap));
 const footer=choices?0:actions.length?footerRows*(buttonH+gap)+20+(paged?pagerSpace:0):24;
 const bodyWidth=choices?w-pad*3-actionWidth:w-pad*2;
 const bodyX=choices?-w/2+pad+bodyWidth/2:0;
 const bodyTop=h/2-header-previewHeight,bodyBottom=-h/2+pad+footer,bodyHeight=bodyTop-bodyBottom;
 const shade=ui.create('PaperRow',parent);shade.name='PanelBackdrop';ui.fullSurface(shade,'#29251f78');ui.block(shade);
 const n=ui.create('Story',parent,0,0,w,h);n.name='Panel_'+o.kind;ui.paper(n,w,h);ui.block(n);
 const title=ui.display(n,o.title,-(o.close?40:0),h/2-header/2,w-pad*2-(o.close?92:0),54,touch?34:29);title.lineHeight=44;title.enableWrapText=false;title.overflow=Label.Overflow.SHRINK;
 const fixed:UIButton[]=[];
 if(o.close)fixed.push(ui.closeButton(n,w/2-pad-34,h/2-header/2,80,touch?88:60,o.close));
 ui.divider(n,0,h/2-header+10,w-pad*2);
 const groups=presentation?.sections;
 let contentHeight=Math.max(bodyHeight,textHeight(o.body,bodyWidth)+12);
 const gallery=presentation?.gallery;
 const headingFont=(touch?30:24)*o.fontScale;
 if(groups?.length)contentHeight=Math.max(bodyHeight,groups.reduce((sum,s)=>sum+textHeight(s.title,bodyWidth,headingFont)+12+textHeight(s.body,bodyWidth)+8+30,0));
 const cardWidth=(bodyWidth-32)/3,nameFont=(touch?25:20)*o.fontScale,detailFont=(touch?20:16)*o.fontScale;
 const nameHeight=Math.max(36,...(gallery??[]).map(item=>textHeight(item.title,cardWidth-24,nameFont)));
 const detailHeight=Math.max(28,...(gallery??[]).map(item=>textHeight(item.detail,cardWidth-24,detailFont)));
 const cardHeight=24+136+16+nameHeight+8+detailHeight+20,rowHeight=cardHeight+22;
 if(gallery?.length)contentHeight=Math.max(bodyHeight,Math.ceil(gallery.length/3)*rowHeight);
 const emptyTitleFont=(touch?36:28)*o.fontScale,emptyFont=(touch?27:20)*o.fontScale,emptyWidth=Math.min(700,bodyWidth-64);
 const emptyTitleHeight=textHeight(presentation?.empty?.title??'',bodyWidth-40,emptyTitleFont),emptyBodyHeight=textHeight(presentation?.empty?.body??'',emptyWidth,emptyFont);
 if(presentation?.empty&&!gallery?.length)contentHeight=Math.max(bodyHeight,emptyTitleHeight+24+emptyBodyHeight+40);
 const sc=ui.scroll(n,bodyX,(bodyTop+bodyBottom)/2,bodyWidth,bodyHeight,contentHeight);sc.root.name='PanelReading';
 function bodyLabel(body:string,x:number,y:number,width:number,height:number,size=font):Label{
  const l=ui.label(sc.content,body,x,y,width,height,size);l.verticalAlign=VerticalTextAlignment.TOP;l.lineHeight=size*1.5;return l;
 }
 if(gallery?.length){
  gallery.forEach((item,i)=>{
   const rowTop=Math.floor(i/3)*rowHeight,x=-bodyWidth/2+cardWidth/2+(i%3)*(cardWidth+16),y=-rowTop-cardHeight/2;
   const b=ui.button(sc.content,'',x,y,cardWidth,cardHeight,item.run,{},false,false,true);b.key='artwork.inspect.'+item.artwork.id;b.label.node.active=false;fixed.push(b);
   const focus=b.focus;b.focus=value=>{focus(value);if(value){const current=sc.scroll.getScrollOffset().y,bottom=rowTop+cardHeight;const next=rowTop<current||cardHeight>bodyHeight?rowTop:bottom>current+bodyHeight?bottom-bodyHeight:current;sc.scroll.stopAutoScroll();sc.scroll.scrollToOffset(new Vec2(0,Math.max(0,Math.min(contentHeight-bodyHeight,next))),0);}};
   const top=cardHeight/2-24,art=ui.create('PaperRow',b.node,0,top-68,cardWidth-36,136);drawArtwork(art,item.artwork,cardWidth-36,136);
   const name=ui.label(b.node,item.title,0,top-136-16-nameHeight/2,cardWidth-24,nameHeight,nameFont,HorizontalTextAlignment.CENTER);name.lineHeight=nameFont*1.5;
   const detail=ui.label(b.node,item.detail,0,top-136-16-nameHeight-8-detailHeight/2,cardWidth-24,detailHeight,detailFont,HorizontalTextAlignment.CENTER);detail.lineHeight=detailFont*1.5;detail.color=new Color(C.muted);
  });
 }else if(presentation?.empty){
  const top=Math.max(20,(contentHeight-emptyTitleHeight-24-emptyBodyHeight)/2);
  const title=ui.display(sc.content,presentation.empty.title,0,-top-emptyTitleHeight/2,bodyWidth-40,emptyTitleHeight,emptyTitleFont,HorizontalTextAlignment.CENTER);title.lineHeight=emptyTitleFont*1.5;
  const hint=bodyLabel(presentation.empty.body,0,-top-emptyTitleHeight-24-emptyBodyHeight/2,emptyWidth,emptyBodyHeight,emptyFont);hint.horizontalAlign=HorizontalTextAlignment.CENTER;hint.color=new Color(C.muted);
 }else if(groups?.length){
  let y=0;groups.forEach((section,index)=>{
   const headingHeight=textHeight(section.title,bodyWidth,headingFont),heading=ui.display(sc.content,section.title,0,y-headingHeight/2,bodyWidth,headingHeight,headingFont);heading.color=new Color(C.accent);heading.lineHeight=headingFont*1.5;
   const height=textHeight(section.body,bodyWidth)+8;bodyLabel(section.body,0,y-headingHeight-12-height/2,bodyWidth,height);y-=headingHeight+12+height+30;
   if(index<groups.length-1)ui.divider(sc.content,0,y+16,bodyWidth);
  });
 }else bodyLabel(o.body,0,-contentHeight/2,bodyWidth,contentHeight);
 if(contentHeight>bodyHeight+4){const cue=ui.label(n,'ui.textScroll',bodyX,bodyBottom-12,bodyWidth,24,touch?22:14,HorizontalTextAlignment.RIGHT);cue.color=new Color(C.muted);cue.lineHeight=24;}
 const actionRoot=ui.create('PaperRow',n);actionRoot.name='PanelActions';
 const choiceH=Math.min(buttonH,h-header-pad-(paged?pagerSpace:0)-gap);
 const renderActions=(page:number)=>{
  ui.clear(actionRoot);const shown=[...fixed],batch=panelPage(actions,page,limit);
  batch.items.forEach((a,i)=>{
   const cols=choices?1:footerCols,rows=choices?batch.items.length:Math.ceil(batch.items.length/cols);
   const bw=choices?actionWidth:footerButtonWidth;
   const bh=choices?choiceH:buttonH;
   const x=choices?w/2-pad-actionWidth/2:-(cols*bw+(cols-1)*gap)/2+bw/2+(i%cols)*(bw+gap);
   const y=choices?h/2-header-bh/2-i*(bh+gap):-h/2+pad+(paged?pagerSpace:0)+buttonH/2+(rows-1-Math.floor(i/cols))*(buttonH+gap);
   const b=ui.button(actionRoot,a.key,x,y,bw,bh,a.run,a.params,a.primary??false);b.label.fontSize=actionFont;b.label.lineHeight=actionLine;b.label.node.getComponent(UITransform)!.setContentSize(bw-24,bh-20);b.label.overflow=Label.Overflow.SHRINK;shown.push(b);
  });
  if(batch.pages>1){
   const x=choices?w/2-pad-actionWidth/2:0,y=-h/2+pad+pagerH/2,bw=choices?(actionWidth-12)/2:Math.min(220,(actionWidth-12)/2),bh=pagerH;
   const prev=ui.button(actionRoot,'ui.pagePrevious',x-(bw+12)/2,y,bw,bh,()=>renderActions(batch.page-1),{},false,false,true);
   const next=ui.button(actionRoot,'ui.pageNext',x+(bw+12)/2,y,bw,bh,()=>renderActions(batch.page+1),{},false,false,true);
   prev.node.active=batch.page>0;next.node.active=batch.page<batch.pages-1;
   [prev,next].forEach(b=>{b.label.fontSize=touch?24:17;if(b.node.active)shown.push(b);});
   ui.label(actionRoot,'ui.pageCount',x,y+bh/2+18,actionWidth,28,touch?22:15,HorizontalTextAlignment.CENTER,{page:batch.page+1,total:batch.pages});
  }
  o.buttonsChanged(shown);
 };
 renderActions(0);ui.transition(n,o.reduceMotion);
 return {node:n,scroll:sc.scroll,preview:{x:bodyX,y:h/2-header-previewHeight/2,width:bodyWidth,height:previewHeight}};
}

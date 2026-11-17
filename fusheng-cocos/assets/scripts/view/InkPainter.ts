import { Color, Graphics, Label, Node, UITransform, Layers, HorizontalTextAlignment, VerticalTextAlignment, Mask } from 'cc';
import { I18n } from '../data/I18n';
export class InkGradient {color='rgba(43,42,38,.05)';addColorStop(_at:number,color:string):void{if(_at===0)this.color=color;}}
type Style=string|InkGradient;
type PenState={matrix:number[];alpha:number;fill:Style;stroke:Style;width:number;font:string;align:string;baseline:string};
export class InkPainter {
 private state:PenState={matrix:[1,0,0,1,0,0],alpha:1,fill:'#2b2a26',stroke:'#2b2a26',width:2,font:'18px serif',align:'left',baseline:'middle'};
 private stack:PenState[]=[];
 private current={x:0,y:0};
 private start={x:0,y:0};
 private commands:((g:Graphics)=>void)[]=[];
 private graphicsStack:Graphics[]=[];
 private clipRect={x:0,y:0,w:1,h:1};
 private active:Graphics;
 constructor(readonly node:Node,readonly graphics:Graphics,private readonly i18n:I18n){this.active=graphics;}
 get globalAlpha():number{return this.state.alpha;}set globalAlpha(v:number){this.state.alpha=v;}
 get fillStyle():Style{return this.state.fill;}set fillStyle(v:Style){this.state.fill=v;}
 get strokeStyle():Style{return this.state.stroke;}set strokeStyle(v:Style){this.state.stroke=v;}
 get lineWidth():number{return this.state.width;}set lineWidth(v:number){this.state.width=v;}
 lineCap='round';lineJoin='round';
 get font():string{return this.state.font;}set font(v:string){this.state.font=v;}
 get textAlign():string{return this.state.align;}set textAlign(v:string){this.state.align=v;}
 get textBaseline():string{return this.state.baseline;}set textBaseline(v:string){this.state.baseline=v;}
 save():void{this.stack.push({...this.state,matrix:this.state.matrix.slice()});this.graphicsStack.push(this.active);}
 restore():void{const s=this.stack.pop();if(s)this.state=s;const previous=this.graphicsStack.pop()??this.graphics;if(this.active!==previous){const layer=new Node('InkAfterClip');layer.layer=Layers.Enum.UI_2D;previous.node.addChild(layer);layer.addComponent(UITransform).setContentSize(1280,720);this.active=layer.addComponent(Graphics);}else this.active=previous;}
 private transform(a:number,b:number,c:number,d:number,e:number,f:number):void{const m=this.state.matrix;this.state.matrix=[m[0]*a+m[2]*b,m[1]*a+m[3]*b,m[0]*c+m[2]*d,m[1]*c+m[3]*d,m[0]*e+m[2]*f+m[4],m[1]*e+m[3]*f+m[5]];}
 translate(x:number,y:number):void{this.transform(1,0,0,1,x,y);}
 scale(x:number,y:number):void{this.transform(x,0,0,y,0,0);}
 rotate(r:number):void{this.transform(Math.cos(r),Math.sin(r),-Math.sin(r),Math.cos(r),0,0);}
 private point(x:number,y:number){const m=this.state.matrix;return {x:m[0]*x+m[2]*y+m[4],y:-(m[1]*x+m[3]*y+m[5])};}
 private color(style:Style):Color{const s=typeof style==='string'?style:style.color;const nums=s.match(/[\d.]+/g);let c:Color;if(s.startsWith('rgb')&&nums)c=new Color(Number(nums[0]),Number(nums[1]),Number(nums[2]),nums[3]===undefined?255:Number(nums[3])*255);else c=new Color(s);c.a*=this.state.alpha;return c;}
 beginPath():void{this.commands=[];}
 clip():void {const r=this.clipRect,container=new Node('SkyMask');container.layer=Layers.Enum.UI_2D;this.active.node.addChild(container);container.setPosition(r.x+r.w/2,-r.y-r.h/2);container.addComponent(UITransform).setContentSize(r.w,r.h);const mask=container.addComponent(Mask);mask.type=Mask.Type.GRAPHICS_RECT;const ink=new Node('ClippedInk');ink.layer=Layers.Enum.UI_2D;container.addChild(ink);ink.setPosition(-r.x-r.w/2,r.y+r.h/2);ink.addComponent(UITransform).setContentSize(1280,720);this.active=ink.addComponent(Graphics);this.commands=[];}
 moveTo(x:number,y:number):void{const p=this.point(x,y);this.commands.push(g=>g.moveTo(p.x,p.y));this.current={x,y};this.start={x,y};}
 lineTo(x:number,y:number):void{const p=this.point(x,y);this.commands.push(g=>g.lineTo(p.x,p.y));this.current={x,y};}
 quadraticCurveTo(cx:number,cy:number,x:number,y:number):void{const p=this.point(x,y),q=this.point(cx,cy);this.commands.push(g=>g.quadraticCurveTo(q.x,q.y,p.x,p.y));this.current={x,y};}
 bezierCurveTo(x1:number,y1:number,x2:number,y2:number,x:number,y:number):void{const a=this.point(x1,y1),b=this.point(x2,y2),p=this.point(x,y);this.commands.push(g=>g.bezierCurveTo(a.x,a.y,b.x,b.y,p.x,p.y));this.current={x,y};}
 closePath():void{this.commands.push(g=>g.close());this.current=this.start;}
 arc(x:number,y:number,r:number,start:number,end:number,anticlockwise=false):void{this.ellipse(x,y,r,r,0,start,end,anticlockwise);}
 ellipse(x:number,y:number,rx:number,ry:number,rotation:number,start:number,end:number,anticlockwise=false):void{let sweep=end-start;if(Math.abs(sweep)>=Math.PI*2)sweep=anticlockwise?-Math.PI*2:Math.PI*2;else if(anticlockwise&&sweep>0)sweep-=Math.PI*2;else if(!anticlockwise&&sweep<0)sweep+=Math.PI*2;const segments=Math.max(6,Math.ceil(Math.abs(sweep)*Math.max(rx,ry)/8));for(let i=0;i<=segments;i++){const a=start+sweep*i/segments,px=Math.cos(a)*rx,py=Math.sin(a)*ry;const xx=x+px*Math.cos(rotation)-py*Math.sin(rotation),yy=y+px*Math.sin(rotation)+py*Math.cos(rotation);if(i===0)this.moveTo(xx,yy);else this.lineTo(xx,yy);}}
 arcTo(x1:number,y1:number,x2:number,y2:number,r:number):void{const from=this.current;const ax=from.x-x1,ay=from.y-y1,bx=x2-x1,by=y2-y1,al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);if(!al||!bl){this.lineTo(x1,y1);return;}const radius=Math.min(r,al/2,bl/2);this.lineTo(x1+ax/al*radius,y1+ay/al*radius);this.quadraticCurveTo(x1,y1,x1+bx/bl*radius,y1+by/bl*radius);}
 rect(x:number,y:number,w:number,h:number):void{this.commands=[];this.clipRect={x,y,w,h};this.moveTo(x,y);this.lineTo(x+w,y);this.lineTo(x+w,y+h);this.lineTo(x,y+h);this.closePath();}
 fillRect(x:number,y:number,w:number,h:number):void{this.rect(x,y,w,h);this.fill();}
 strokeRect(x:number,y:number,w:number,h:number):void{this.rect(x,y,w,h);this.stroke();}
 fill():void{for(const cmd of this.commands)cmd(this.active);this.active.fillColor=this.color(this.state.fill);this.active.fill();}
 stroke():void{for(const cmd of this.commands)cmd(this.active);this.active.lineCap=Graphics.LineCap.ROUND;this.active.lineJoin=Graphics.LineJoin.ROUND;this.active.strokeColor=this.color(this.state.stroke);this.active.lineWidth=this.state.width*Math.hypot(this.state.matrix[0],this.state.matrix[1]);this.active.stroke();}
 createLinearGradient(_x:number,_y:number,_x2:number,_y2:number):InkGradient{return new InkGradient();}
 createRadialGradient(_x:number,_y:number,_r:number,_x2:number,_y2:number,_r2:number):InkGradient{return new InkGradient();}
 fillText(key:string,x:number,y:number):void{const text=this.i18n.t(key);if(!text)return;const n=new Node('InkLetter');n.layer=Layers.Enum.UI_2D;this.active.node.addChild(n);const size=Number(/([\d.]+)px/.exec(this.state.font)?.[1]??18);const p=this.point(x,y);n.setPosition(p.x,p.y);const tr=n.addComponent(UITransform);tr.setContentSize(Math.max(size*text.length+8,20),size*1.6);tr.setAnchorPoint(this.state.align==='center'?.5:this.state.align==='right'?1:0,.5);const l=n.addComponent(Label);l.string=text;l.fontSize=size;l.lineHeight=size*1.5;l.fontFamily='serif';l.color=this.color(this.state.fill);l.horizontalAlign=this.state.align==='center'?HorizontalTextAlignment.CENTER:this.state.align==='right'?HorizontalTextAlignment.RIGHT:HorizontalTextAlignment.LEFT;l.verticalAlign=VerticalTextAlignment.CENTER;}
}

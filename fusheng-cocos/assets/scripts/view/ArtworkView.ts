import { Color, Graphics, Node, UITransform } from 'cc';
import { Artwork, SUBJECTS } from '../core/WeekLife';

// Each work has a small, repeatable composition: the subject and chosen palette
// are recognizable both in the collection and on the physical wall.
export function drawArtwork(node:Node,work:Artwork,width:number,height:number):void {
 const g=node.getComponent(Graphics)??node.addComponent(Graphics);g.clear();
 node.getComponent(UITransform)?.setContentSize(width,height);
 const ink=work.style==='ink'?'#4b514d':work.style==='quiet'?'#768078':SUBJECTS.find(s=>s.id===work.subject)?.color??'#917358';
 const box=(x:number,y:number,w:number,h:number,color:string)=>{g.fillColor=new Color(color);g.rect(x,y,w,h);g.fill();};
 const line=(points:number[][],color=ink,weight=2)=>{g.strokeColor=new Color(color);g.lineWidth=weight;g.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))g.lineTo(p[0],p[1]);g.stroke();};
 const circle=(x:number,y:number,r:number,color:string)=>{g.fillColor=new Color(color);g.circle(x,y,r);g.fill();};
 box(-width/2,-height/2,width,height,'#9e8263');box(-width/2+4,-height/2+4,width-8,height-8,'#f5efdf');
 const w=width*.37,h=height*.33;
 if(work.subject==='window'){
  box(-w,-h,w*2,h*2,work.style==='warm'?'#ead8ad':'#dce2d9');line([[-w,0],[w,0]]);line([[0,-h],[0,h]]);circle(w*.5,h*.5,h*.22,ink);line([[-w,-h],[-w,h],[w,h],[w,-h],[-w,-h]]);
 }else if(work.subject==='alley'){
  for(let i=0;i<4;i++){const x=-w+i*w*.55;box(x,-h,w*.4,h*(1.3+(i%2)*.5),i%2?'#d7cbb5':ink);box(x+w*.1,-h*.3,w*.12,h*.3,'#f5df9e');}
  line([[-w,-h],[0,-h*.25],[w,-h]]);
 }else if(work.subject==='pond'){
  box(-w,-h,w*2,h*.8,'#c2d2cb');line([[-w,h*.15],[-w*.3,h*.65],[w*.25,h*.1],[w,h*.5]]);for(let i=0;i<4;i++)line([[-w*.7+i*3,-h*.2-i*h*.16],[w*.6-i*4,-h*.2-i*h*.16]],ink,1);
 }else if(work.subject==='tree'){
  line([[0,-h],[w*.1,h*.55]],ink,3);line([[w*.04,0],[-w*.5,h*.5]],ink,2);circle(-w*.3,h*.5,h*.42,ink);circle(w*.27,h*.65,h*.35,work.style==='warm'?'#b2aa6e':'#a2b0a0');line([[-w,-h],[w,-h]],ink,1);
 }else if(work.subject==='book'){
  for(let i=0;i<3;i++)box(-w*.8+i*w*.2,-h+i*h*.45,w*1.4,h*.36,i%2?'#c6b394':ink);line([[-w*.9,h*.7],[w*.2,h*.7],[w*.2,-h*.6]],'#f2ead5',1);
 }else{
  circle(0,h*.35,h*.38,ink);box(-w*.4,-h,w*.8,h*.9,ink);circle(-h*.1,h*.4,h*.035,'#f5efdf');circle(h*.1,h*.4,h*.035,'#f5efdf');
 }
 box(width/2-13,-height/2+9,5,7,'#a6402f');
}

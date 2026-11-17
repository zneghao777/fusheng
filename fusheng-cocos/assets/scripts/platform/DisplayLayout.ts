/** Keep the original game units while revealing extra paper on wider/taller screens. */
export function displayLayout(width:number,height:number):{width:number;height:number;scale:number}{
 const ratio=Math.max(1,width)/Math.max(1,height);
 const w=Math.max(1280,720*ratio),h=Math.max(720,1280/ratio);
 return {width:w,height:h,scale:Math.min(width/1280,height/720)};
}

/** Input coordinates include the extra visible area; simulation coordinates do not. */
export function scenePoint(x:number,y:number,width:number,height:number,frame:{x:number;y:number;scale:number;scaleX?:number;scaleY?:number}={x:0,y:0,scale:1}):{x:number;y:number}{
 return {x:(x-width/2-frame.x)/(frame.scaleX??frame.scale)+640,y:360-(y-height/2-frame.y)/(frame.scaleY??frame.scale)};
}

export interface SceneBounds {left:number;right:number;top:number;bottom:number;}

/** Includes the roof strokes and foundation, while excluding blank paper in the asset. */
export function houseSceneBounds(house:{x1:number;x2:number;roofY:number;tier:number}):SceneBounds{
 return {left:Math.max(0,house.x1-52),right:Math.min(1280,house.x2+52),top:Math.max(0,house.roofY-(house.tier===0?50:house.tier===1?44:30)),bottom:698};
}

export function gameSceneLayout(width:number,height:number,safe:{x:number;y:number;width:number;height:number},touch:boolean,bounds?:SceneBounds,expanded=true,bottomInset=0){
 const headerHeight=touch?88:60,left=-width/2+safe.x+8,right=-width/2+safe.x+safe.width-8;
 const safeTop=-height/2+safe.y+safe.height,safeBottom=-height/2+safe.y,bottom=safeBottom+8+bottomInset;
 const railWidth=expanded?Math.min(152,Math.max(112,safe.width*.085)):96;
 const rail={left:right-railWidth+8,right:right+8,top:safeTop,bottom:safeBottom,width:railWidth,x:right-railWidth/2+8};
 const top=safeTop-headerHeight-8,availableWidth=rail.left-left-8;
 const b=bounds??{left:0,right:1280,top:0,bottom:720};
 const scaleY=Math.max(.1,Math.min(availableWidth/(b.right-b.left),(top-bottom)/(b.bottom-b.top)));
 // Widen the house architecture and spacing. Individual furniture and people
 // are counter-scaled by WorldView so their silhouettes retain their proportions.
 const scaleX=bounds?availableWidth/(b.right-b.left):scaleY;
 const room={left,right:left+(b.right-b.left)*scaleX,top,bottom:top-(b.bottom-b.top)*scaleY};
 return {x:left-(b.left-640)*scaleX,y:top-(360-b.top)*scaleY,scale:scaleY,scaleX,scaleY,headerHeight,bottom,room,rail};
}

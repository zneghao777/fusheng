export interface PanelGeometry {
 width:number;height:number;padding:number;titleY:number;
 bodyX:number;bodyY:number;bodyWidth:number;bodyHeight:number;
 actionX:number;actionWidth:number;actionTop:number;actionHeight:number;gap:number;
 pageSize:number;pagerY:number;font:number;buttonFont:number;
}

/** Logical 1280 x 720 coordinates. Actions never belong to the text viewport. */
export function panelGeometry(touch:boolean,actionCount:number,previewHeight=0):PanelGeometry {
 const width=touch?1136:940,height=touch?640:600,padding=touch?32:30;
 const actionWidth=touch?476:380,bodyWidth=width-padding*3-actionWidth;
 const bodyTop=height/2-(touch?104:94),bodyBottom=-height/2+padding;
 const bodyHeight=bodyTop-bodyBottom-previewHeight;
 return {width,height,padding,titleY:height/2-48,
  bodyX:-width/2+padding+bodyWidth/2,bodyY:bodyTop-previewHeight-bodyHeight/2,
  bodyWidth,bodyHeight,actionX:width/2-padding-actionWidth/2,actionWidth,
  actionTop:bodyTop,actionHeight:touch?96:76,gap:touch?12:10,
  pageSize:touch?3:4,pagerY:-height/2+padding+(touch?32:24),font:touch?28:17,buttonFont:touch?27:17};
}

export function panelPage<T>(items:readonly T[],page:number,size=4):{items:T[];page:number;pages:number} {
 const pages=Math.max(1,Math.ceil(items.length/size)),current=Math.max(0,Math.min(pages-1,page));
 return {items:items.slice(current*size,(current+1)*size),page:current,pages};
}

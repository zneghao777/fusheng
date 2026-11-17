import { describe, expect, it } from 'vitest';
import { displayLayout, gameSceneLayout, houseSceneBounds, scenePoint } from '../../assets/scripts/platform/DisplayLayout';

describe('full-screen display geometry',()=>{
 it.each([[869,400],[874,402],[932,430],[1280,720],[1024,768],[400,869]])('fills %s × %s without changing game-unit proportions',(width,height)=>{
  const size=displayLayout(width,height);
  expect(size.width/size.height).toBeCloseTo(width/height,8);
  expect(size.width).toBeGreaterThanOrEqual(1280);
  expect(size.height).toBeGreaterThanOrEqual(720);
  expect(size.width*size.scale).toBeCloseTo(width,8);
  expect(size.height*size.scale).toBeCloseTo(height,8);
 });
 it.each([[869,400],[1024,768]])('maps taps back to the same furniture after adapting %s × %s',(width,height)=>{
  const size=displayLayout(width,height);
  const tap={x:830+(size.width-1280)/2,y:720-610+(size.height-720)/2};
  expect(scenePoint(tap.x,tap.y,size.width,size.height)).toEqual({x:830,y:610});
 });
 it.each([[869,400,48],[844,390,44],[667,375,0],[1024,768,0]])('fits the actual house at the safe left edge of %s × %s',(width,height,inset)=>{
  const size=displayLayout(width,height),safe={x:inset/size.scale,y:0,width:size.width-inset/size.scale,height:size.height};
  for(const house of [{x1:150,x2:1130,roofY:120,tier:2},{x1:110,x2:1170,roofY:90,tier:1},{x1:70,x2:1210,roofY:78,tier:0}]){
   const bounds=houseSceneBounds(house),f=gameSceneLayout(size.width,size.height,safe,true,bounds),r=f.room;
   expect(r.left).toBeCloseTo(-size.width/2+safe.x+8,6);
   expect(r.right).toBeLessThan(f.rail.left);
   expect(r.top).toBeLessThanOrEqual(size.height/2-f.headerHeight-8+.001);
   expect(r.bottom).toBeGreaterThanOrEqual(-size.height/2+8-.001);
   const coverage=(r.right-r.left)*(r.top-r.bottom)/(safe.width*safe.height);
   expect(coverage).toBeGreaterThan(width/height>1.6?.75:.5);
   expect(bounds.left).toBeLessThan(house.x1-36);expect(bounds.right).toBeGreaterThan(house.x2+36);
   expect(bounds.top).toBeLessThan(house.roofY-26);expect(bounds.bottom).toBeGreaterThan(690);
   const point={x:830,y:610},ui={x:size.width/2+f.x+(point.x-640)*f.scaleX,y:size.height/2+f.y+(360-point.y)*f.scaleY};
   const result=scenePoint(ui.x,ui.y,size.width,size.height,f);
   expect(result.x).toBeCloseTo(point.x,6);expect(result.y).toBeCloseTo(point.y,6);
  }
 });
 it('keeps the right rail narrow and gives its released space back to the room',()=>{
  const size=displayLayout(869,400),safe={x:0,y:0,width:size.width,height:size.height},bounds=houseSceneBounds({x1:150,x2:1130,roofY:120,tier:2});
  const expanded=gameSceneLayout(size.width,size.height,safe,true,bounds,true),collapsed=gameSceneLayout(size.width,size.height,safe,true,bounds,false);
  expect(expanded.rail.width/safe.width).toBeLessThanOrEqual(.1);
  expect(collapsed.room.right).toBeGreaterThan(expanded.room.right);
  expect(collapsed.scaleY).toBeCloseTo(expanded.scaleY,8);
  expect(expanded.scaleX*(expanded.scaleY/expanded.scaleX)).toBeCloseTo(expanded.scaleY,8);
 });
 it('keeps the expanded furniture catalog below the full roof and room inside safe insets',()=>{
  for(const [width,height] of [[869,400],[1280,720]]){
   const size=displayLayout(width,height),safe={x:24/size.scale,y:12/size.scale,width:size.width-40/size.scale,height:size.height-20/size.scale};
   const safeBottom=-size.height/2+safe.y,safeTop=safeBottom+safe.height,catalogTop=safeBottom+8+160;
   for(const house of [{x1:150,x2:1130,roofY:120,tier:2},{x1:110,x2:1170,roofY:90,tier:1},{x1:70,x2:1210,roofY:78,tier:0}]){
    const bounds=houseSceneBounds(house),f=gameSceneLayout(size.width,size.height,safe,true,bounds,true,176);
    expect(f.room.bottom-catalogTop).toBeGreaterThanOrEqual(16-.001);
    expect(f.room.top).toBeLessThanOrEqual(safeTop-f.headerHeight-8+.001);
    expect(f.room.bottom).toBeLessThan(f.room.top);
    expect(f.rail.bottom).toBeCloseTo(safeBottom,6);
    for(const point of [{x:bounds.left,y:bounds.top},{x:bounds.right,y:bounds.bottom},{x:830,y:610}]){
     const css={x:(size.width/2+f.x+(point.x-640)*f.scaleX)*size.scale,y:(size.height/2-f.y-(360-point.y)*f.scaleY)*size.scale};
     expect(css.y).toBeGreaterThanOrEqual((size.height/2-f.room.top)*size.scale-.001);
     expect(css.y).toBeLessThanOrEqual((size.height/2-f.room.bottom)*size.scale+.001);
     const mapped=scenePoint(css.x/size.scale,size.height-css.y/size.scale,size.width,size.height,f);
     expect(mapped.x).toBeCloseTo(point.x,6);expect(mapped.y).toBeCloseTo(point.y,6);
    }
   }
  }
 });
 it('releases room height when collapsing the catalog and restores zero-reserve coordinates on exit',()=>{
  const size=displayLayout(869,400),safe={x:0,y:0,width:size.width,height:size.height},bounds=houseSceneBounds({x1:110,x2:1170,roofY:90,tier:1});
  const normal=gameSceneLayout(size.width,size.height,safe,true,bounds);
  const expanded=gameSceneLayout(size.width,size.height,safe,true,bounds,true,176);
  const collapsed=gameSceneLayout(size.width,size.height,safe,true,bounds,true,100);
  const restored=gameSceneLayout(size.width,size.height,safe,true,bounds,true,0);
  const selectionTop=-size.height/2+safe.y+8+84;
  expect(collapsed.room.bottom-selectionTop).toBeGreaterThanOrEqual(16-.001);
  expect(collapsed.scaleY).toBeGreaterThan(expanded.scaleY);
  expect(restored.scaleY).toBeGreaterThan(collapsed.scaleY);
  expect(collapsed.room.top).toBeCloseTo(normal.room.top,8);
  expect(restored).toEqual(normal);
  const point={x:830,y:610},screens=[expanded,collapsed,restored].map(f=>({x:(size.width/2+f.x+(point.x-640)*f.scaleX)*size.scale,y:(size.height/2-f.y-(360-point.y)*f.scaleY)*size.scale}));
  expect(screens[0].y).toBeLessThan(screens[1].y);expect(screens[1].y).toBeLessThan(screens[2].y);
  [expanded,collapsed,restored].forEach((f,i)=>{
   const mapped=scenePoint(screens[i].x/size.scale,size.height-screens[i].y/size.scale,size.width,size.height,f);
   expect(mapped.x).toBeCloseTo(point.x,6);expect(mapped.y).toBeCloseTo(point.y,6);
  });
 });

});

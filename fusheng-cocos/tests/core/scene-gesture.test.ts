import { describe,expect,it } from 'vitest';
import { sceneGesture } from '../../assets/scripts/platform/SceneGesture';

describe('scene gestures in CSS pixels',()=>{
 const start={x:200,y:100,time:1000};
 it('distinguishes an upward swipe from tapping furniture',()=>{
  expect(sceneGesture(start,{x:205,y:170,time:1220})).toBe('jump');
  expect(sceneGesture(start,{x:204,y:103,time:1160})).toBe('tap');
 });
 it.each([{x:270,y:110,time:1200},{x:205,y:40,time:1200},{x:280,y:170,time:1200},{x:205,y:130,time:1200},{x:200,y:170,time:1800}])('ignores sideways, downwards, diagonal, short and slow swipes: %s',(end)=>{
  expect(sceneGesture(start,end)).toBe('none');
 });
});

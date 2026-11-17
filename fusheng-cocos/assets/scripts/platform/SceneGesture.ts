export interface GesturePoint {x:number;y:number;time:number;}

/** CSS-pixel, bottom-origin coordinates keep gestures independent of camera zoom. */
export function sceneGesture(start:GesturePoint,end:GesturePoint):'tap'|'jump'|'none'{
 const dx=end.x-start.x,dy=end.y-start.y,elapsed=end.time-start.time;
 if(elapsed<0||elapsed>650)return 'none';
 if(dy>=40&&Math.abs(dx)<=Math.max(24,dy*.55))return 'jump';
 return Math.hypot(dx,dy)<=10?'tap':'none';
}

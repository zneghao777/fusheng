import { ImageAsset, Node, Rect, Size, Vec2, resources, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';

// Exported from the immutable HTML drawing routines; runtime uses native sprites.
export class ArtAssets {
 static pending=0;
 private static frames=new Map<string,Promise<SpriteFrame>>();
 private static slices=new Map<string,SpriteFrame>();
 private static characterRequests=new WeakMap<Node,symbol>();
 static frame(path:string):Promise<SpriteFrame>{
  let pending=this.frames.get(path);
  if(!pending){this.pending++;pending=new Promise((resolve,reject)=>resources.load('art/'+path,ImageAsset,(error,image)=>{
   this.pending--;if(error){reject(error);return;}const texture=new Texture2D();texture.image=image;
   texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   const frame=new SpriteFrame();frame.texture=texture;resolve(frame);
  }));this.frames.set(path,pending);}return pending;
 }
 static async paint(node:Node,path:string,w:number,h:number):Promise<void>{
  const frame=await this.frame(path);if(!node.isValid)return;
  const sprite=node.getComponent(Sprite)??node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=frame;
  node.getComponent(UITransform)!.setContentSize(w,h);
 }
 static async character(node:Node,path:string,index:number):Promise<void>{
  const request=Symbol();this.characterRequests.set(node,request);
  const key=path+':'+index;let frame=this.slices.get(key);
  if(!frame){const atlas=await this.frame('characters/'+path);frame=this.slices.get(key);
   if(!frame){frame=new SpriteFrame();frame.texture=atlas.texture;frame.rect=new Rect(index%8*160,Math.floor(index/8)*220,160,220);frame.originalSize=new Size(160,220);frame.offset=new Vec2(0,0);this.slices.set(key,frame);}}
  // A reused portrait keeps its previous frame until the latest request is ready.
  if(!node.isValid||this.characterRequests.get(node)!==request)return;const sprite=node.getComponent(Sprite)??node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=frame;node.getComponent(UITransform)!.setContentSize(80,110);
 }
}

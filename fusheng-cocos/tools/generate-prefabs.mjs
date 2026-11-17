import fs from 'node:fs';import crypto from 'node:crypto';
fs.mkdirSync('assets/resources/prefabs',{recursive:true});
function node(name,w,h){return {__type__:'cc.Node',_name:name,_objFlags:0,_parent:null,_children:[],_active:true,_components:[{__id__:2}],_prefab:null,_lpos:{__type__:'cc.Vec3',x:0,y:0,z:0},_lrot:{__type__:'cc.Quat',x:0,y:0,z:0,w:1},_lscale:{__type__:'cc.Vec3',x:1,y:1,z:1},_layer:33554432,_id:name};}
const names=['Title','SaveSelect','Create','Prologue','HUD','Pause','Character','Help','Build','DaySummary','Birthday','Story','Event','Twist','Reply','Legacy','Origin','TouchControls','Rotate','Code','Settings','Confirm','PaperButton','PaperLabel','PaperRow','PaperScroll'];
for(const name of names){const label=name==='PaperLabel',button=name==='PaperButton';const w=button?240:label?800:1280,h=button?96:label?80:720;
 const data=[{__type__:'cc.Prefab',_name:name,_objFlags:0,_native:'',data:{__id__:1},optimizationPolicy:0,persistent:false},node(name,w,h),{__type__:'cc.UITransform',_name:'',_objFlags:0,node:{__id__:1},_enabled:true,__prefab:null,_contentSize:{__type__:'cc.Size',width:w,height:h},_anchorPoint:{__type__:'cc.Vec2',x:.5,y:.5},_id:name+'Transform'}];
 if(label){data[1]._components.push({__id__:3});data.push({__type__:'cc.Label',node:{__id__:1},_enabled:true,_string:'',_fontSize:28,_lineHeight:40,_isSystemFontUsed:true,_fontFamily:'serif',_color:{__type__:'cc.Color',r:43,g:42,b:38,a:255},_horizontalAlign:0,_verticalAlign:1,_overflow:2,_enableWrapText:true,_isBold:false,_id:name+'Label'});}
 if(button){data[1]._components.push({__id__:3});data.push({__type__:'cc.Button',node:{__id__:1},_enabled:true,_interactable:true,_transition:0,clickEvents:[],_id:name+'Button'});}
 const path='assets/resources/prefabs/'+name+'.prefab';fs.writeFileSync(path,JSON.stringify(data,null,2));if(!fs.existsSync(path+'.meta'))fs.writeFileSync(path+'.meta',JSON.stringify({ver:'1.1.50',importer:'prefab',imported:true,uuid:crypto.randomUUID(),files:['.json'],subMetas:{},userData:{}},null,2));
}
console.log('Generated 17 screens and shared native Cocos UI prefabs.');

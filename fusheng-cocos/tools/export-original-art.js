async page => {
 const output='fusheng-cocos/assets/resources/art';
 await page.goto(sourceURL);
 const exportImage=async(name,spec)=>{
  const data=await page.evaluate(({name,spec})=>{
   const scale=2,canvas=document.createElement('canvas');
   canvas.width=spec.width*scale;canvas.height=spec.height*scale;
   const pen=canvas.getContext('2d');pen.scale(scale,scale);pen.lineCap='round';pen.lineJoin='round';
   const previous=G;G=pen;tGlobal=spec.time||0;
   if(spec.kind==='ui'){
    const gradient=pen.createRadialGradient(640,288,30,640,288,890);
    gradient.addColorStop(0,'#fffdf6');gradient.addColorStop(1,'#ece4d3');
    pen.fillStyle=gradient;pen.fillRect(0,0,1280,720);
    pen.fillStyle='rgba(120,110,90,.03)';for(let y=0;y<720;y+=5)pen.fillRect(0,y,1280,.65);
   }else if(spec.kind==='glow'){
    const gradient=pen.createRadialGradient(280,280,4,280,280,280);
    gradient.addColorStop(0,'rgba(255,198,126,.28)');gradient.addColorStop(.55,'rgba(255,198,126,.10)');gradient.addColorStop(1,'rgba(255,198,126,0)');
    pen.fillStyle=gradient;pen.fillRect(0,0,560,560);
   }else if(spec.kind==='scene'){
    S.clock=spec.hour*60;S.scene=spec.scene;HOUSE=HOUSES[spec.house||'flat'];
    pen.drawImage(paper,0,0,1280,720);
    if(spec.scene==='home'){
     const draw=eval('('+buildHouse.toString().replace(/G = hctx;|G = ctx;|G\.setTransform\(1,0,0,1,0,0\);|G\.clearRect\(0,0,W,H\);/g,'')+')');
     draw();drawWindows();
    }else drawOutdoorScene();
   }else if(spec.kind==='furniture'){
    pen.translate(spec.width/2,spec.height-12);drawFurn({t:spec.id,x:0,y:0},false);
   }else if(spec.kind==='character'){
    for(let row=0;row<4;row++)for(let col=0;col<8;col++){
     pen.save();pen.beginPath();pen.rect(col*80,row*110,80,110);pen.clip();
     tGlobal=col/8*Math.PI*2/13;
     drawPerson(col*80+40,row*110+104,row>=2?-1:1,row%2===1,{...spec.look,stage:spec.stage});pen.restore();
    }
   }
   G=previous;
   return canvas.toDataURL('image/png').split(',')[1];
  },{name,spec});
  await saveArt(name,data);
 };
 await exportImage('ui/paper',{kind:'ui',width:1280,height:720});
 await exportImage('ui/glow',{kind:'glow',width:560,height:560});
 const catalog=await page.evaluate(()=>({furniture:Object.entries(FURN).map(([id,d])=>({id,width:d.w+32,height:d.h+28})),characters:CHARS}));
 for(const house of ['flat','rental','villa'])for(const hour of [7,18,22])await exportImage('scenes/home-'+house+'-'+hour,{kind:'scene',scene:'home',house,hour,width:1280,height:720});
 for(const scene of ['street','park','store','book'])for(const hour of [7,18,22])await exportImage('scenes/'+scene+'-'+hour,{kind:'scene',scene,hour,width:1280,height:720});
 for(const item of catalog.furniture)await exportImage('furniture/'+item.id,{kind:'furniture',...item});
 for(const c of catalog.characters)for(const stage of ['kid','young','mid'])await exportImage('characters/'+c.id+'-'+stage,{kind:'character',look:{...c,scale:c.scale||1},stage,width:640,height:440});
 await exportImage('characters/npc-young',{kind:'character',look:{cloth:'#dcd6c6',hair:'short',hairColor:'#4a463c',skin:'#efe6d4',scale:1.04},stage:'young',width:640,height:440});
 return {scenes:21,characters:19,furniture:catalog.furniture.length,density:2,source:'game/index.html'};
}

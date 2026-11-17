import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const hash=text=>createHash('sha256').update(text).digest('hex').slice(0,12);

export async function installMobileDisplay(target){
 // Creator 3.8.8 hard-caps Web DPR at 2 in its bundled screen adapter. Patch only
 // this project's generated engine, with a strict guard and fresh cache names.
 const source=path.join(target,'src'),mapName=(await fs.readdir(source)).find(name=>/^import-map\..*\.json$/.test(name));
 if(!mapName)throw Error('Missing Cocos import map');
 const map=JSON.parse(await fs.readFile(path.join(source,mapName),'utf8'));
 const enginePath=path.resolve(source,map.imports.cc),engine=await fs.readFile(enginePath,'utf8');
 const getter=/key:"devicePixelRatio",get:function\(\)\{var (\w+);return Math\.min\(null!==\(\1=window\.devicePixelRatio\)&&void 0!==\1\?\1:1,2\)\}/g;
 if([...engine.matchAll(getter)].length!==1)throw Error('Cocos DPR adapter changed; review the generated engine before packaging');
 const patched=engine.replace(getter,'key:"devicePixelRatio",get:function(){return Math.min(window.devicePixelRatio||1,3,Math.max(1,Math.sqrt(5000000/Math.max(1,window.innerWidth*window.innerHeight))))}');
 const engineName=`cc.${hash(patched)}.js`;
 await fs.writeFile(path.join(path.dirname(enginePath),engineName),patched);
 await fs.rm(enginePath);
 map.imports.cc=map.imports.cc.replace(path.basename(enginePath),engineName);
 const mapText=JSON.stringify(map),nextMap=`import-map.${hash(mapText)}.json`;
 await fs.writeFile(path.join(source,nextMap),mapText);await fs.rm(path.join(source,mapName));
 const shell=await fs.readFile(new URL('../web-mobile/display.html',import.meta.url),'utf8');
 let html=await fs.readFile(path.join(target,'index.html'),'utf8');
 html=html.replaceAll(mapName,nextMap).replace('</head>','<link rel="manifest" href="./manifest.webmanifest"><meta name="theme-color" content="#f3eddf"></head>').replace('</body>',shell+'\n</body>');
 await fs.writeFile(path.join(target,'index.html'),html);
 await fs.writeFile(path.join(target,'manifest.webmanifest'),JSON.stringify({name:'浮生·纸片屋',short_name:'浮生',lang:'zh-CN',scope:'./',display:'fullscreen',orientation:'landscape',background_color:'#f3eddf',theme_color:'#f3eddf'}));
 console.log('Installed adaptive mobile shell and DPR 3 rendering (5 megapixel budget).');
}

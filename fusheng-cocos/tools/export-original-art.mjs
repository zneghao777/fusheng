import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceURL=new URL('../../game/index.html',import.meta.url).href;
const saveArt=async(name,data)=>{const p=path.join(root,'assets/resources/art',name+'.png');await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,Buffer.from(data,'base64'));};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage();const exportArt=eval('('+await fs.readFile(new URL('./export-original-art.js',import.meta.url),'utf8')+')');console.log(JSON.stringify(await exportArt(page)));}finally{await browser.close();}

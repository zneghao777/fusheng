import fs from 'node:fs';
import { validate } from './validate-content.mjs';
const tables=['origins','characters','creeds','houses','furniture','tasks','skills','scenes','events','twists','story','npc','actions','prologue','paint-titles','rules','life-course'];
const c=Object.fromEntries(tables.map(t=>[t,JSON.parse(fs.readFileSync('content/'+t+'.json','utf8'))]));
c.i18n=JSON.parse(fs.readFileSync('content/i18n/zh-CN.json','utf8'));c.ui=JSON.parse(fs.readFileSync('content/ui.json','utf8'));Object.assign(c.i18n,c.ui);
for(const file of ['life-course','life-panels','scene-polish']){
 const data=JSON.parse(fs.readFileSync('content/'+file+'.json','utf8'));
 const dictionary=data.copy??data;
 Object.assign(c.i18n,dictionary);Object.assign(c.ui,dictionary);
}
validate(c);
fs.mkdirSync('assets/resources/config',{recursive:true});
fs.writeFileSync('assets/resources/config/content.json',JSON.stringify(c));
for(const t of tables)fs.copyFileSync('content/'+t+'.json','assets/resources/config/'+t+'.json');
// Some tracks are intentionally not redistributed. Keep the original catalog
// intact and choose an available track when building on a fresh checkout.
const music=JSON.parse(fs.readFileSync('content/music.json','utf8'));
const preferredFallback={title:'recap',day:'market',book:'night'};
for(const track of music.tracks){
 if(track.resource&&!fs.existsSync('assets/resources/'+track.resource+'.bin'))track.resource=null;
}
const available=music.tracks.filter(track=>track.resource);
for(const track of music.tracks){
 if(!track.resource&&available.length){
  const preferred=available.find(candidate=>candidate.id===preferredFallback[track.id]);
  const original=available.find(candidate=>candidate.id===track.fallback);
  track.fallback=(preferred??original??available[0]).id;
 }
}
fs.writeFileSync('assets/resources/config/music.json',JSON.stringify(music,null,2)+'\n');
console.log('Validated and built all content tables.');

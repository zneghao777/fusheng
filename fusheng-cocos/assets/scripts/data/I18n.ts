export class I18n {
 constructor(private readonly strings:Record<string,string>){}
 t(key:string,params:Record<string,string|number>={}):string{const id=key.startsWith('@')?key.slice(1):key;const text=this.strings[id]??key;return text.replace(/\{(\w+)\}/g,(_,name:string)=>{const v=params[name];return v===undefined?'{'+name+'}':typeof v==='string'?this.t(v):String(v);});}
 plain(key:string,params:Record<string,string|number>={}):string{return this.t(key,params).replace(/<\/(?:p|div|li)>/g,'\n').replace(/<br\s*\/?\s*>/g,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
}

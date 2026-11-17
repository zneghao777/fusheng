let strings:Record<string,string>={};
export function setWeekLanguage(dictionary:Record<string,string>):void {strings=dictionary;}
export function weekText(key:string,params:Record<string,string|number|undefined>={}):string {
 return (strings[key]??key).replace(/\{(\w+)\}/g,(_,name:string)=>String(params[name]??`{${name}}`));
}

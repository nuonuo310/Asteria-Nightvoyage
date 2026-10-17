// Project-owned launch policy. Windows libuv supplements missing OS variables.
// Supply empty placeholders for unwanted ones, then remove them before core loads.
const names=['SystemRoot','SYSTEMROOT','WINDIR','TEMP','TMP','TMPDIR','LANG','LC_ALL'];
const windowsEmpty=['HOMEDRIVE','HOMEPATH','LOGONSERVER','PATH','USERDOMAIN','USERNAME','USERPROFILE'];
const refused=()=>{throw Error('inline_child_environment_refused');};
export function inlineChildEnvironment(environment=process.env,{platform=process.platform}={}){
  const clean={};
  for(const name of names){const value=environment[name];if(typeof value==='string'&&value.length<=4096&&!value.includes('\0'))clean[name]=value;}
  if(platform==='win32'){
    for(const name of windowsEmpty)clean[name]='';
    const drive=environment.SYSTEMDRIVE??environment.SystemDrive;clean.SYSTEMDRIVE=typeof drive==='string'&&/^[A-Za-z]:$/.test(drive)?drive:'';
    if(!Object.hasOwn(clean,'SystemRoot')&&!Object.hasOwn(clean,'SYSTEMROOT'))clean.SYSTEMROOT='';
    clean.WINDIR??='';clean.TEMP??='';
  }
  return clean;
}
export function assertInlineChildEnvironment(environment=process.env,{platform=process.platform}={}){
  const keys=Object.keys(environment),allowed=new Set(platform==='win32'?names.map(n=>n.toUpperCase()):names),empty=new Set(windowsEmpty);
  const canonical=key=>platform==='win32'?key.toUpperCase():key;
  // Unknown names are rejected before any of their values are read or removed.
  if(keys.some(key=>!allowed.has(canonical(key))&&!(platform==='win32'&&(empty.has(canonical(key))||canonical(key)==='SYSTEMDRIVE'))))refused();
  for(const key of keys){const value=environment[key],name=canonical(key);if(typeof value!=='string'||value.length>4096||value.includes('\0')||platform==='win32'&&empty.has(name)&&value!==''||platform==='win32'&&name==='SYSTEMDRIVE'&&!/^$|^[A-Za-z]:$/.test(value))refused();}
  if(platform==='win32')for(const key of keys)if(empty.has(canonical(key)))delete environment[key];
  return {environmentAllowlisted:true,windowsEmptyPlaceholdersCleared:platform==='win32'};
}

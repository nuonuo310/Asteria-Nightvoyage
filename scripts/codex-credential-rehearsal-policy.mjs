// Closed launch policy for the independent credential rehearsal.
import path from 'node:path';

export const credentialRehearsalSentinel='nightvoyage-independent-oauth-sentinel-not-a-credential';
export const credentialRehearsalScenarios=Object.freeze(['success','timeout','cancel','late_response','failed_spawn','failed_child','secret_output']);
export const windowsCredentialRehearsalPlaceholderKeys=Object.freeze([
  'HOMEDRIVE','HOMEPATH','LOGONSERVER','SYSTEMDRIVE','TEMP','TMP','TMPDIR','USERDOMAIN','USERNAME','USERPROFILE'
]);
export const credentialRehearsalExpectedOutcomes=Object.freeze({
  success:Object.freeze({status:'completed',reason:null,finalReplyAccepted:true,processStarted:true}),
  timeout:Object.freeze({status:'blocked',reason:'timeout',finalReplyAccepted:false,processStarted:true}),
  cancel:Object.freeze({status:'blocked',reason:'cancelled',finalReplyAccepted:false,processStarted:true}),
  late_response:Object.freeze({status:'blocked',reason:'cancelled',finalReplyAccepted:false,processStarted:true}),
  failed_spawn:Object.freeze({status:'blocked',reason:'spawn_failed',finalReplyAccepted:false,processStarted:false}),
  failed_child:Object.freeze({status:'blocked',reason:'untrusted_child_output',finalReplyAccepted:false,processStarted:true}),
  secret_output:Object.freeze({status:'blocked',reason:'untrusted_child_output',finalReplyAccepted:false,processStarted:true})
});

const maxValueLength=4096;
function boundedString(value){return typeof value==='string'&&value.length<=maxValueLength&&!value.includes('\0');}
function environmentEntries(environment){
  if(!environment||typeof environment!=='object'||Array.isArray(environment))return null;
  const entries=new Map();
  for(const key of Reflect.ownKeys(environment)){
    if(typeof key!=='string')return null;
    const descriptor=Object.getOwnPropertyDescriptor(environment,key);
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!boundedString(descriptor.value))return null;
    const canonical=key.toUpperCase();
    if(entries.has(canonical))return null;
    entries.set(canonical,{key,value:descriptor.value});
  }
  return entries;
}
function environmentValue(environment,canonicalName){
  if(!environment||typeof environment!=='object'||Array.isArray(environment))return null;
  let match=null;
  for(const key of Reflect.ownKeys(environment)){
    if(typeof key!=='string'||key.toUpperCase()!==canonicalName)continue;
    const descriptor=Object.getOwnPropertyDescriptor(environment,key);
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!boundedString(descriptor.value)||match!==null)return null;
    match={key,value:descriptor.value};
  }
  return match;
}
function samePath(left,right,platform){
  const implementation=platform==='win32'?path.win32:path;
  const normalize=value=>implementation.normalize(value);
  return platform==='win32'?normalize(left).toLowerCase()===normalize(right).toLowerCase():normalize(left)===normalize(right);
}

export function credentialRehearsalEnvironment(environment=process.env,{platform=process.platform}={}){
  const clean={ACCESS_TOKEN:credentialRehearsalSentinel,PATH:path.dirname(process.execPath)};
  if(platform!=='win32')return clean;
  const systemRoot=environmentValue(environment,'SYSTEMROOT');
  if(!systemRoot||!path.win32.isAbsolute(systemRoot.value))throw Error('credential_rehearsal_system_root_required');
  clean.SystemRoot=systemRoot.value;
  clean.WINDIR=systemRoot.value;
  for(const key of windowsCredentialRehearsalPlaceholderKeys)clean[key]='';
  return clean;
}

export function validateAndClearCredentialRehearsalEnvironment(environment=process.env,{platform=process.platform}={}){
  const entries=environmentEntries(environment);
  if(!entries)return false;
  const allowed=['ACCESS_TOKEN','PATH',...(platform==='win32'?['SYSTEMROOT','WINDIR',...windowsCredentialRehearsalPlaceholderKeys]:[])];
  if(entries.size!==allowed.length||allowed.some(key=>!entries.has(key)))return false;
  const token=entries.get('ACCESS_TOKEN'),pathEntry=entries.get('PATH');
  if(token.value!==credentialRehearsalSentinel||!samePath(pathEntry.value,path.dirname(process.execPath),platform))return false;
  if(platform==='win32'){
    const systemRoot=entries.get('SYSTEMROOT'),windir=entries.get('WINDIR');
    if(!path.win32.isAbsolute(systemRoot.value)||!samePath(systemRoot.value,windir.value,platform))return false;
    for(const key of windowsCredentialRehearsalPlaceholderKeys)if(entries.get(key).value!=='')return false;
    for(const key of windowsCredentialRehearsalPlaceholderKeys)delete environment[entries.get(key).key];
  }
  return {environmentAllowlisted:true,windowsStartupPlaceholdersCleared:platform==='win32'};
}

export function validateCredentialRehearsalResult(result){
  if(!result||typeof result!=='object')return false;
  const expected=credentialRehearsalExpectedOutcomes[result.scenario];
  if(!expected)return false;
  return result.status===expected.status&&result.reason===expected.reason&&result.finalReplyAccepted===expected.finalReplyAccepted&&
   result.processStarted===expected.processStarted&&result.ownedChildClosed===true&&result.closedBeforeLeaseDisposal===true&&
   result.leaseActive===false&&result.secretReferenceDisposed===true&&result.syntheticRevocationAttempted===true&&
   result.parentEnvironmentAssigned===false&&result.lateReplyPublished===false&&result.independentNodePeer===true&&
   result.syntheticCredentialOnly===true&&result.rawChildOutputReturned===false&&result.credentialsPersisted===false&&
   result.credentialReads===0&&result.realModelRequests===0&&result.nativeCredentialContainmentVerified===false&&
   result.attributionMatched===expected.finalReplyAccepted&&Array.isArray(result.order)&&result.order.at(-3)==='child_closed'&&
   result.order.at(-2)==='lease_disposed'&&result.order.at(-1)==='synthetic_revocation';
}

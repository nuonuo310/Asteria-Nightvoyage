// Cleanup of one freshly leased temporary probe root only. No old-root search or process action.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const retryable=new Set(['EBUSY','EPERM','EACCES','ENOTEMPTY','EMFILE','ENFILE']);
const delays=[100,200,400,800,1600,1600,1600];
const locations=new Map([['state','state'],['cwd','cwd'],['profile','profile'],['relay-state','relay_state'],['fictional-model-catalog.json','fixture_catalogue'],['local-post-observations.json','local_post_record'],['local-post-observations.json.next','local_post_record']]);
function failure(error,root){
 const code=retryable.has(error?.code)?error.code:['ENOENT','EINVAL','EIO'].includes(error?.code)?error.code:'unknown';
 const operation=['rmdir','unlink','scandir','open','lstat','stat'].includes(error?.syscall)?error.syscall:'unknown';
 let locationClass='unavailable';
 if(typeof error?.path==='string'&&path.isAbsolute(error.path)){
  const relative=path.relative(root,error.path);
  locationClass=!relative?'owned_root':relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)?'outside_owned_root':locations.get(relative.split(path.sep)[0])??'other_owned_descendant';
 }
 return {code,operation,locationClass};
}
export function createOwnedProbeCleanup(root){
 if(arguments.length!==1||typeof root!=='string'||!path.isAbsolute(root)||!/^nightvoyage-request-observer-[A-Za-z0-9_-]{6,}$/.test(path.basename(root)))throw Error('cleanup_lease_invalid');
 let identity;
 try{
  if(fs.realpathSync(path.dirname(root))!==fs.realpathSync(os.tmpdir()))throw Error();
  for(let cursor=path.dirname(root);;){if(fs.existsSync(path.join(cursor,'.git')))throw Error();const next=path.dirname(cursor);if(next===cursor)break;cursor=next;}
  identity=fs.lstatSync(root,{bigint:true});if(!identity.isDirectory()||identity.isSymbolicLink())throw Error();
 }catch{throw Error('cleanup_lease_invalid');}
 let used=false;
 return async function cleanup(){
  if(arguments.length||used)throw Error('cleanup_lease_consumed');used=true;
  const result={policyVersion:'owned-probe-directory-cleanup-v1',status:'blocked',attempts:0,retries:0,scheduledDelayMs:0,
   firstFailure:null,lastFailure:null,stopClass:null,rootIdentityChecked:true,
   pathReturned:false,priorDirectoriesScanned:false,processesRestarted:0,signalsSent:0};
  for(let i=0;i<=delays.length;i++){
   try{const current=fs.lstatSync(root,{bigint:true});
    if(!current.isDirectory()||current.isSymbolicLink()||current.dev!==identity.dev||current.ino!==identity.ino){result.stopClass='owned_root_identity_changed';return result;}
   }catch(error){if(error?.code==='ENOENT'){result.status='removed';return result;}result.lastFailure=failure(error,root);result.firstFailure??=result.lastFailure;result.stopClass='owned_root_check_failed';return result;}
   result.attempts++;
   try{
    // Single attempt here: the outer schedule is the entire retry policy.
    await fs.promises.rm(root,{recursive:true,force:true,maxRetries:0});
    try{fs.lstatSync(root);result.stopClass='removal_not_confirmed';return result;}
    catch(error){if(error?.code!=='ENOENT')throw error;}
    result.status='removed';return result;
   }catch(error){
    result.lastFailure=failure(error,root);result.firstFailure??=result.lastFailure;
    if(!retryable.has(result.lastFailure.code)){result.stopClass='non_retryable_cleanup_error';return result;}
    if(i===delays.length){result.stopClass='cleanup_retry_limit';return result;}
    result.retries++;result.scheduledDelayMs+=delays[i];await new Promise(resolve=>setTimeout(resolve,delays[i]));
   }
  }
 };
}

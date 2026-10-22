import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {rehearseCodexPlanCredentialOwner} from '../scripts/codex-plan-credential-rehearsal.mjs';
import {credentialRehearsalEnvironment,credentialRehearsalSentinel,windowsCredentialRehearsalPlaceholderKeys,validateAndClearCredentialRehearsalEnvironment,validateCredentialRehearsalResult} from '../scripts/codex-credential-rehearsal-policy.mjs';
const marker=credentialRehearsalSentinel;
const childPath=fileURLToPath(new URL('../test-support/codex-plan-credential-child.mjs',import.meta.url));
const checkerPath=fileURLToPath(new URL('../scripts/check-codex-plan-credential-owner.mjs',import.meta.url));
for(const [scenario,reason] of [['success',null],['timeout','timeout'],['cancel','cancelled'],['late_response','cancelled'],['failed_spawn','spawn_failed'],['failed_child','untrusted_child_output'],['secret_output','untrusted_child_output']]){
 test('independent credential lifetime: '+scenario,async()=>{
  const r=await rehearseCodexPlanCredentialOwner({scenario,timeoutMs:scenario==='timeout'?100:5000});
  assert.equal(validateCredentialRehearsalResult(r),true);
  assert.equal(r.status,scenario==='success'?'completed':'blocked');assert.equal(r.reason,reason);
  assert.equal(r.ownedChildClosed,true);assert.equal(r.closedBeforeLeaseDisposal,true);
  assert.equal(r.leaseActive,false);assert.equal(r.secretReferenceDisposed,true);assert.equal(r.parentEnvironmentAssigned,false);
  assert.equal(r.finalReplyAccepted,scenario==='success');assert.equal(r.lateReplyPublished,false);
  assert.equal(r.order.at(-3),'child_closed');assert.equal(r.order.at(-2),'lease_disposed');assert.equal(r.order.at(-1),'synthetic_revocation');
  assert.equal(r.realModelRequests,0);assert.equal(r.credentialReads,0);assert.equal(r.nativeCredentialContainmentVerified,false);
  assert.equal(JSON.stringify(r).includes(marker),false);
 });
}
test('closed rehearsal inputs cannot acquire real authority or evaluate getters',async()=>{
 let reads=0;
 const accessor={get scenario(){reads++;return 'success';}};
 for(const v of [accessor,{token:'real-forbidden'},{executable:process.execPath},{env:{}},{scenario:'real'},{timeoutMs:0},Object.assign(Object.create({}),{scenario:'success'})])await assert.rejects(rehearseCodexPlanCredentialOwner(v),/credential_rehearsal_options_invalid/);
 assert.equal(reads,0);
});
test('Windows launch policy supplies neutral placeholders and excludes dummy inherited configuration',()=>{
 assert.throws(()=>credentialRehearsalEnvironment({},{platform:'win32'}),/credential_rehearsal_system_root_required/);
 assert.throws(()=>credentialRehearsalEnvironment({SystemRoot:'relative-windows-root'},{platform:'win32'}),/credential_rehearsal_system_root_required/);
 const root=process.platform==='win32'?process.env.SystemRoot:'C:\\Windows';
 const parent={SystemRoot:root,USERPROFILE:'C:\\independent-dummy-profile',TEMP:'C:\\independent-dummy-temp',OPENAI_API_KEY:'independent-dummy-key',HTTPS_PROXY:'independent-dummy-proxy',PATH:'independent-dummy-path',Path:'independent-second-dummy-path'};
 const before=structuredClone(parent);
 const env=credentialRehearsalEnvironment(parent,{platform:'win32'});
 assert.equal(env.ACCESS_TOKEN,credentialRehearsalSentinel);assert.equal(env.SystemRoot,root);assert.equal(env.WINDIR,root);
 for(const key of windowsCredentialRehearsalPlaceholderKeys)assert.equal(env[key],'');
 assert.equal(Object.hasOwn(env,'OPENAI_API_KEY'),false);assert.equal(Object.hasOwn(env,'HTTPS_PROXY'),false);
 assert.deepEqual(parent,before);
 const caseVariant=structuredClone(env);delete caseVariant.TEMP;caseVariant.teMp='';
 assert.equal(validateAndClearCredentialRehearsalEnvironment(caseVariant,{platform:'win32'}).environmentAllowlisted,true);
 for(const key of windowsCredentialRehearsalPlaceholderKeys)assert.equal(Object.hasOwn(caseVariant,key),false);
 assert.equal(Object.hasOwn(caseVariant,'teMp'),false);
});
test('credential child rejects unexpected keys and nonempty Windows placeholders before scenario output',()=>{
 const unexpected={...credentialRehearsalEnvironment(),OPENAI_API_KEY:'independent-dummy-key'};
 let replay=spawnSync(process.execPath,[childPath,'success','Asteria-Nightvoyage'],{env:unexpected,encoding:'utf8',shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
 assert.equal(replay.status,2);assert.equal(replay.stdout,'');assert.equal(replay.stderr,'');
 if(process.platform==='win32'){
  const nonempty=credentialRehearsalEnvironment();nonempty.TEMP='C:\\independent-dummy-temp';
  replay=spawnSync(process.execPath,[childPath,'success','Asteria-Nightvoyage'],{env:nonempty,encoding:'utf8',shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
  assert.equal(replay.status,2);assert.equal(replay.stdout,'');assert.equal(replay.stderr,'');
 }
});
test('environment validation rejects malformed, duplicate and accessor values before clearing',()=>{
 const base=credentialRehearsalEnvironment({SystemRoot:'C:\\Windows'},{platform:'win32'});
 const unexpected=structuredClone(base);unexpected.OPENAI_API_KEY='independent-dummy-key';
 assert.equal(validateAndClearCredentialRehearsalEnvironment(unexpected,{platform:'win32'}),false);assert.equal(Object.hasOwn(unexpected,'TEMP'),true);
 const nonempty=structuredClone(base);nonempty.TEMP='independent-dummy-temp';
 assert.equal(validateAndClearCredentialRehearsalEnvironment(nonempty,{platform:'win32'}),false);assert.equal(nonempty.TEMP,'independent-dummy-temp');
 const wrongToken=structuredClone(base);wrongToken.ACCESS_TOKEN='independent-dummy-token';
 assert.equal(validateAndClearCredentialRehearsalEnvironment(wrongToken,{platform:'win32'}),false);
 const duplicate=structuredClone(base);duplicate.SYSTEMROOT=duplicate.SystemRoot;
 assert.equal(validateAndClearCredentialRehearsalEnvironment(duplicate,{platform:'win32'}),false);
 const accessor=structuredClone(base);delete accessor.TEMP;Object.defineProperty(accessor,'TEMP',{enumerable:true,get(){throw Error('accessor_must_not_run');}});
 assert.equal(validateAndClearCredentialRehearsalEnvironment(accessor,{platform:'win32'}),false);
});
test('exact scenario validation rejects status or reason drift',()=>{
 const result={scenario:'success',status:'completed',reason:null,finalReplyAccepted:true,processStarted:true,ownedChildClosed:true,closedBeforeLeaseDisposal:true,leaseActive:false,secretReferenceDisposed:true,syntheticRevocationAttempted:true,parentEnvironmentAssigned:false,lateReplyPublished:false,independentNodePeer:true,syntheticCredentialOnly:true,rawChildOutputReturned:false,credentialsPersisted:false,credentialReads:0,realModelRequests:0,nativeCredentialContainmentVerified:false,attributionMatched:true,order:['lease_opened','child_spawned','child_closed','lease_disposed','synthetic_revocation']};
 assert.equal(validateCredentialRehearsalResult(result),true);
 assert.equal(validateCredentialRehearsalResult({...result,status:'blocked'}),false);
 assert.equal(validateCredentialRehearsalResult({...result,reason:'child_failed'}),false);
});
test('checker rejects unexpected arguments without running scenarios',()=>{
 const replay=spawnSync(process.execPath,[checkerPath,'unexpected'],{encoding:'utf8',shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
 assert.equal(replay.status,1);assert.equal(replay.stdout,'');assert.match(replay.stderr,/^credential_rehearsal_arguments_invalid\r?\n$/);
});

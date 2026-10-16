// Read-only preparation, NOT a paid profile or dispatch admission function.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inlineProtocolVersion,inlineIdentity,buildInlineRequest} from './inline-evidence-protocol.js';
import {snapshot,hash} from './contract.js';
import {assertAppraisalReviewJsonData} from './appraisal-review-memory.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const manifestPath='src/inline-entry-review.json';
export const inlineEntryReviewVersion='inline-entry-readiness-v1';
export const preservedAccountIds=Object.freeze(['compact-appraisal-trial-20261015','compact-single-scene-diagnostic-20261015','pruned-v2-dream-trial-20261015','scene-continuity-dream-trial-20261016']);
const digest=b=>createHash('sha256').update(b).digest('hex');
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
const stop=code=>{throw Error(code);};
function plainPath(p){
  let current=path.resolve(p);
  for(;;){const s=fs.lstatSync(current);if(s.isSymbolicLink())stop('unsafe_path');const parent=path.dirname(current);if(parent===current)break;current=parent;}
  return path.resolve(p);
}
function boundedFile(p,max=2097152){const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>max)stop('unsafe_or_oversized_file');const b=fs.readFileSync(p);if(b.length>max)stop('unsafe_or_oversized_file');return b;}
function json(p){const value=JSON.parse(boundedFile(p).toString('utf8'));assertAppraisalReviewJsonData(value);return value;}
export function inlineEntryInventory(repositoryRoot=root){
  const base=plainPath(repositoryRoot),files={};
  const add=relative=>{const b=boundedFile(path.join(base,relative)),text=b.toString('utf8');if(!Buffer.from(text).equals(b))stop('invalid_inventory_utf8');files[relative]=digest(text.replaceAll('\r\n','\n'));};
  const walk=relative=>{plainPath(path.join(base,relative));for(const entry of fs.readdirSync(path.join(base,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){const next=relative+'/'+entry.name;if(next===manifestPath)continue;if(entry.isSymbolicLink())stop('unsafe_inventory_path');if(entry.isDirectory())walk(next);else if(entry.isFile())add(next);else stop('unsafe_inventory_path');}};
  walk('src');walk('fixtures');add('package.json');return Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b,'en')));
}
function reviewedSource(repositoryRoot){
  const base=plainPath(repositoryRoot),profile=json(plainPath(path.join(base,manifestPath)));
  if(profile.schemaVersion!==1||profile.reviewVersion!==inlineEntryReviewVersion||profile.protocolVersion!==inlineProtocolVersion||hash(profile.identity)!==hash(inlineIdentity())||profile.paidEvaluationApproved!==false||profile.fixtureEgressApproved!==false||profile.pricing!==null||profile.budgetCny!==null||profile.liveEntryAvailable!==false)stop('invalid_entry_review');
  const files=inlineEntryInventory(base);if(hash(files)!==hash(profile.files))stop('source_inventory_changed');
  if(profile.inventoryScope!=='all-src-and-fixtures-plus-package-excluding-self'||profile.fixturePath!=='fixtures/quality/sparse-context.json')stop('invalid_entry_review');
  const packageData=json(path.join(base,'package.json'));if(Object.keys(packageData.dependencies??{}).length||Object.keys(packageData.optionalDependencies??{}).length)stop('external_dependencies_require_review');
  const input=snapshot(json(path.join(base,profile.fixturePath)));if(input.sources.some(s=>s.grant.modelEgress!==false))stop('fictional_no_egress_fixture_required');
  const request=buildInlineRequest({stage:'scene',index:0,snapshot:input,scenes:[]},{model:'deepseek-flash',maxOutputTokens:400});
  return {base,input,inventoryFiles:Object.keys(files).length,requestBytes:Buffer.byteLength(JSON.stringify(request.body))};
}
// No lock acquisition or recovery: an occupied/stale lock or journal residue blocks.
// This snapshot observation is not a transaction and must be rechecked under a
// future runtime owner lock before any account creation or credential access.
function inspectHistory(directory,base,sourceIds){
  const d=plainPath(directory);if(d===base||d.startsWith(base+path.sep))stop('data_inside_checkout');
  const files=['state.json','withdrawals.json','deletions.json'];
  const busy=()=>['owner.lock','recovery.lock','snapshot.tmp'].some(f=>fs.existsSync(path.join(d,f)));
  if(busy())stop('history_requires_owner_or_recovery_review');
  const readFile=(f,i)=>{try{return boundedFile(path.join(d,f));}catch(error){if(i>0&&error.code==='ENOENT')return null;throw error;}};
  const bytes=files.map(readFile),values=bytes.map(b=>{const v=b===null?[]:JSON.parse(b.toString('utf8'));assertAppraisalReviewJsonData(v);return v;}),[state,withdrawals,deletions]=values;
  if(state.version!==1||!record(state.billing)||state.billing.version!==1||!record(state.billing.accounts)||!Array.isArray(withdrawals)||!withdrawals.every(s=>typeof s==='string')||!Array.isArray(deletions))stop('invalid_history_snapshot');
  if(withdrawals.some(s=>sourceIds.includes(s)))stop('source_withdrawn');if(deletions.length)stop('history_requires_owner_or_recovery_review');
  let calls=0,held=0n;
  for(const [accountId,account]of Object.entries(state.billing.accounts)){
    if(!record(account)||!record(account.attempts))stop('invalid_history_snapshot');
    const rows=Object.values(account.attempts);if(preservedAccountIds.includes(accountId)&&(rows.length!==1||account.allowance?.id!==accountId))stop('preserved_unknown_history_mismatch');
    if(Object.entries(account.attempts).some(([id,row])=>row?.requestId!==id))stop('invalid_history_snapshot');
    for(const row of rows){
      if(!record(row)||!['settled','unknown'].includes(row.status))stop('history_requires_owner_or_recovery_review');
      if(row.status==='unknown'){
        if(!preservedAccountIds.includes(accountId))stop('unrelated_unsettled_attempt');
        if(row.reservedMicroCny!=='2203200'||row.chargedMicroCny!=='2203200'||row.maxOutputTokens!==400||typeof row.requestId!=='string'||typeof row.runId!=='string'||!/^[a-f0-9]{64}$/.test(row.fingerprint)||hash(row.sourceRefs)!==hash([{id:'q-sparse-memory',version:'1'}]))stop('preserved_unknown_history_mismatch');
        calls++;held+=BigInt(row.chargedMicroCny);
      }else if(preservedAccountIds.includes(accountId))stop('preserved_unknown_history_mismatch');
    }
  }
  if(calls!==4||held!==8812800n||preservedAccountIds.some(id=>!Object.hasOwn(state.billing.accounts,id)))stop('preserved_unknown_history_mismatch');
  if(busy()||files.some((f,i)=>((current)=>current===null?bytes[i]!==null:bytes[i]===null||!current.equals(bytes[i]))(readFile(f,i))))stop('history_snapshot_changed');
  return {checked:true,kind:'read_only_shape_observation_not_dispatch_admission',preservedUnknowns:4,heldMicroCny:held.toString(),providerChargeKnown:false,accountMutation:false};
}
export function inlineEntryPreflight({repositoryRoot=root,historyDirectory}={}){
  const common={ready:false,reviewVersion:inlineEntryReviewVersion,protocolVersion:inlineProtocolVersion,credentialRead:false,realModelRequests:0,liveEntryAvailable:false,paidProfileAvailable:false,paidEvaluationApproved:false,fixtureEgressApproved:false,budgetCny:null,pricing:null,qualityAssessed:false,semanticSupport:'not_assessed'};
  let source;try{source=reviewedSource(repositoryRoot);}catch(error){const known=['source_inventory_changed','invalid_entry_review','fictional_no_egress_fixture_required','external_dependencies_require_review'];return {...common,reason:known.includes(error.message)?error.message:'source_review_failed',sourceInventoryMatches:false};}
  const evidence={sourceInventoryMatches:true,inventoryFiles:source.inventoryFiles,inventoryScope:'all-src-and-fixtures-plus-package-excluding-self',recursiveImportClosureProved:false,requestBytes:source.requestBytes,requestByteLimit:65536,requestFits:source.requestBytes<=65536,fixtureMaterialKind:'fictional',generatedEventOrigin:'dream',isRealityFact:false,maxCandidateRuns:1,maxCandidateCalls:3,perCallOutputTokens:400};
  if(historyDirectory===undefined)return {...common,...evidence,reason:'history_directory_required',history:{checked:false}};
  try{return {...common,...evidence,reason:'paid_profile_and_explicit_approval_pending',history:inspectHistory(historyDirectory,source.base,source.input.sources.map(s=>s.id))};}
  catch(error){const known=['data_inside_checkout','history_requires_owner_or_recovery_review','invalid_history_snapshot','source_withdrawn','preserved_unknown_history_mismatch','unrelated_unsettled_attempt','history_snapshot_changed','unsafe_path','unsafe_or_oversized_file'];return {...common,...evidence,reason:known.includes(error.message)?error.message:'history_unavailable_or_invalid',history:{checked:false}};}
}
// An explicit data path is optional for source-only inspection; no user directory default.
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);if(args.length===0||(args.length===1&&args[0]==='preflight')||(args.length===3&&args[0]==='preflight'&&args[1]==='--data-dir'&&args[2]&&!args[2].startsWith('--')))console.log(JSON.stringify(inlineEntryPreflight({historyDirectory:args[2]}),null,2));
  else{console.error('Nightvoyage entry preparation: preflight [--data-dir <existing external Store>]. Read-only; no init/run/live/key/budget option.');process.exitCode=1;}
}

// Durable synthetic stub authority only. Not a paid approval or a secret capability.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store,copy,fail} from './store.js';
import {hash,own,snapshot,config} from './contract.js';
import {validateAllowance} from './budget-ledger.js';
import {inlineProtocolVersion,inlineIdentity,buildInlineRequest} from './inline-evidence-protocol.js';
import {InlineHistoryGuard,inlineCandidateAllowanceId} from './inline-entry-admission.js';
import {assertAppraisalReviewJsonData} from './appraisal-review-memory.js';
export const inlineAuthorizationVersion='inline-authorized-stub-v1';
export const inlineAuthorizationId='inline-controlled-stub-authorization';
const field='inlineEntryAuthorization';
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
function sourceTerms(){
  const review=JSON.parse(fs.readFileSync(new URL('./inline-entry-review.json',import.meta.url),'utf8')),graph=JSON.parse(fs.readFileSync(new URL('./inline-entry-graph.json',import.meta.url),'utf8'));
  const input=snapshot(JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url),'utf8')));if(input.sources.some(s=>s.grant.modelEgress!==false))fail('authorization_fixture_changed');
  return {sourceInventoryHash:hash(review.files),dependencyGraphHash:hash(graph),fixtureHash:hash(input),protocolIdentity:inlineIdentity()};
}
export function inlineAuthorizedInput(){const input=snapshot(JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url),'utf8')));input.sources.forEach(s=>s.grant.modelEgress=true);return input;}
const runConfig=()=>config({scenes:2,maxCalls:3,inputTokens:3300000,outputTokens:1200,perCallOutput:400,timeoutMs:60000});
function checkedAllowance(value,now){
  assertAppraisalReviewJsonData(value);if(!exact(value,['id','mode','approved','expiresAt','limits','pricing','protocolVersion'])||!exact(value.limits,['maxRuns','maxCalls','maxMicroCny'])||!exact(value.pricing,['model','contextTokenLimit','inputMicroCnyPerMillion','outputMicroCnyPerMillion','reference','checkedAt']))fail('synthetic_stub_allowance_required');
  const a=validateAllowance(value);
  if(a.mode!=='stub'||a.id!==inlineCandidateAllowanceId||a.protocolVersion!==inlineProtocolVersion||hash(a.limits)!==hash({maxRuns:1,maxCalls:3,maxMicroCny:3000000})||a.pricing.model!=='deepseek-flash'||a.pricing.contextTokenLimit!==1100000||a.pricing.inputMicroCnyPerMillion!==2000000||a.pricing.outputMicroCnyPerMillion!==8000000||a.pricing.checkedAt!==1||a.pricing.reference!=='https://api-docs.deepseek.com/synthetic-fixture-not-price-review')fail('synthetic_stub_allowance_required');
  if(!Number.isSafeInteger(now)||now<=0||a.expiresAt<=now||a.expiresAt>now+3600000)fail('invalid_stub_authorization_clock');return a;
}
function checkedRecord(record){
  assertAppraisalReviewJsonData(record);if(!exact(record,['schemaVersion','authorizationVersion','id','mode','status','terms','termsHash'])||record.schemaVersion!==1||record.authorizationVersion!==inlineAuthorizationVersion||record.id!==inlineAuthorizationId||record.mode!=='stub'||!['active','revoked'].includes(record.status)||!exact(record.terms,['allowance','baseline','createdAt','expiresAt','sourceInventoryHash','dependencyGraphHash','fixtureHash','protocolIdentity','runConfig','requestId','sessionId'])||hash(record.terms)!==record.termsHash)fail('invalid_inline_authorization');
  const t=record.terms;checkedAllowance(t.allowance,t.createdAt);if(t.expiresAt!==t.allowance.expiresAt||hash(t.runConfig)!==hash(runConfig())||t.requestId!==inlineAuthorizationId||t.sessionId!==inlineAuthorizationId||Object.entries(sourceTerms()).some(([k,v])=>hash(t[k])!==hash(v)))fail('inline_authorization_terms_changed');return record;
}
export function readInlineAuthorization(store,{now=Date.now(),allowExpired=false,allowRevoked=false}={}){
  if(!(store instanceof Store))fail('managed_store_required');store.assert();const record=checkedRecord(own(store.state,field));new InlineHistoryGuard(store,{baseline:record.terms.baseline}).assertPreserved();
  const a=own(store.state.billing.accounts,inlineCandidateAllowanceId);if(!a||a.fingerprint!==hash(record.terms.allowance)||hash(a.allowance)!==hash(record.terms.allowance))fail('authorization_account_mismatch');
  if(!Number.isSafeInteger(now)||now<record.terms.createdAt)fail('invalid_stub_authorization_clock');if(!allowRevoked&&record.status!=='active')fail('inline_authorization_revoked');if(!allowExpired&&now>=record.terms.expiresAt)fail('inline_authorization_expired');return copy(record);
}
export function initInlineStubAuthorization(store,{allowance,approveStub=false,acknowledgePreservedHolds=false,now=Date.now(),fault=()=>{}}={}){
  if(approveStub!==true||acknowledgePreservedHolds!==true)fail('explicit_stub_authorization_required');if(allowance?.mode!=='stub')fail('inline_live_entry_pending');const a=checkedAllowance(allowance,now);
  if(!(store instanceof Store))fail('managed_store_required');store.assert();
  if(Object.hasOwn(store.state,field)){const existing=readInlineAuthorization(store,{now});if(hash(a)!==hash(existing.terms.allowance))fail('inline_authorization_conflict');return existing;}
  if(own(store.state.billing?.accounts??{},inlineCandidateAllowanceId))fail('unbound_candidate_account');
  const guard=new InlineHistoryGuard(store),baseline=guard.capture(),terms={allowance:a,baseline,createdAt:now,expiresAt:a.expiresAt,...sourceTerms(),runConfig:runConfig(),requestId:inlineAuthorizationId,sessionId:inlineAuthorizationId};
  const record={schemaVersion:1,authorizationVersion:inlineAuthorizationVersion,id:inlineAuthorizationId,mode:'stub',status:'active',terms,termsHash:hash(terms)};
  fault('before_authorization_commit');guard.assertPreserved();
  store.state[field]=record;store.state.billing.accounts[inlineCandidateAllowanceId]={fingerprint:hash(a),allowance:a,attempts:{},runIds:[]};
  try{store.save();}catch{delete store.state[field];delete store.state.billing.accounts[inlineCandidateAllowanceId];store.poisoned=true;fail('storage_io_failure');}
  fault('after_authorization_commit');return readInlineAuthorization(store,{now});
}
export function revokeInlineAuthorization(store){const record=readInlineAuthorization(store,{allowExpired:true,allowRevoked:true});if(record.status==='revoked')return record;store.state[field].status='revoked';try{store.save();}catch{store.poisoned=true;fail('storage_io_failure');}return copy(store.state[field]);}
// Admission is checked again under the Store lock before any ledger/client is constructed.
export function requireExistingInlineAuthorization(directory){
  try{let p=path.resolve(directory);for(;;){if(fs.lstatSync(p).isSymbolicLink())fail('unsafe_authorization_path');const parent=path.dirname(p);if(parent===p)break;p=parent;}
    const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),d=path.resolve(directory);if(d===root||d.startsWith(root+path.sep))fail('unsafe_authorization_path');const file=path.join(d,'state.json'),s=fs.lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||s.size>2097152)fail('unsafe_authorization_path');checkedRecord(JSON.parse(fs.readFileSync(file,'utf8'))[field]);
  }catch{fail('existing_stub_authorization_required');}
}
export function assertInlineAuthorizedStage(store,{allowanceId,requestId,runId,payload},phase){
  const record=readInlineAuthorization(store),t=record.terms,request=own(store.state.requests,t.requestId),r=runId&&own(store.state.runs,runId),provider=`${inlineProtocolVersion}:stub:${inlineCandidateAllowanceId}:deepseek-flash:${inlineAuthorizationVersion}:${record.termsHash}`;
  assertAppraisalReviewJsonData(payload);if(allowanceId!==inlineCandidateAllowanceId||request?.runId!==runId||!r||r.status!=='running'||r.id!==runId||r.billingAllowanceId!==inlineCandidateAllowanceId||r.billingProtocolVersion!==inlineProtocolVersion||r.appraisalProtocolVersion!==inlineProtocolVersion||r.authorizationVersion!==inlineAuthorizationVersion||r.authorizationHash!==record.termsHash||r.executionOwner?.schemaVersion!==1||r.executionOwner.family!==`specialized:${inlineProtocolVersion}`||r.executionOwner.providerIdentity!==provider||hash(r.config)!==hash(t.runConfig)||hash(r.snapshot)!==hash(inlineAuthorizedInput())||!exact(payload,['stage','index','snapshot','scenes'])||hash(payload)!==hash({stage:r.scenes.length<2?'scene':'wake',index:r.scenes.length,snapshot:r.snapshot,scenes:r.scenes})||requestId!==`stage-${runId}-${payload.stage}-${payload.index}`)fail('inline_authorized_stage_mismatch');
  const rows=Object.values(store.state.billing.accounts[inlineCandidateAllowanceId].attempts);if(rows.some(row=>row.runId!==runId||row.status==='unknown'))fail('ambiguous_attempt');
  if(phase==='before_reservation'&&rows.some(row=>row.status!=='settled'))fail('ambiguous_attempt');
  buildInlineRequest(payload,{model:t.allowance.pricing.model,maxOutputTokens:400});return record;
}

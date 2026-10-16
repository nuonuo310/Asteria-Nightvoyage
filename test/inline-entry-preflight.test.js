import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {inlineEntryInventory,inlineEntryPreflight,preservedAccountIds} from '../src/inline-entry-preflight.js';
import {prepareInlineEntryHistory} from '../test-support/inline-entry-fixtures.js';
const repo=new URL('..',import.meta.url);
function temp(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-entry-preflight-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;}
function project(t){const d=temp(t);for(const name of ['src','fixtures'])fs.cpSync(new URL(name,repo),path.join(d,name),{recursive:true});fs.copyFileSync(new URL('package.json',repo),path.join(d,'package.json'));return d;}
const bytes=d=>Object.fromEntries(fs.readdirSync(d).sort().filter(f=>fs.statSync(path.join(d,f)).isFile()).map(f=>[f,fs.readFileSync(path.join(d,f)).toString('base64')]));
function change(d,fn){const p=path.join(d,'state.json'),v=JSON.parse(fs.readFileSync(p));fn(v);fs.writeFileSync(p,JSON.stringify(v));}
test('source-only preparation pins recursive production/fixture inventory but never claims import closure or approval',()=>{
  const v=inlineEntryPreflight();assert.equal(v.ready,false);assert.equal(v.reason,'history_directory_required');assert.equal(v.sourceInventoryMatches,true);assert.equal(v.recursiveImportClosureProved,false);assert.equal(v.requestFits,true);assert.equal(v.requestByteLimit,65536);assert.equal(v.maxCandidateCalls,3);assert.equal(v.budgetCny,null);assert.equal(v.pricing,null);assert.equal(v.fixtureEgressApproved,false);assert.equal(v.liveEntryAvailable,false);assert.equal(v.qualityAssessed,false);
  const inventory=inlineEntryInventory();assert.ok(inventory['src/inline-entry-preflight.js']);assert.ok(inventory['src/appraisal-review-memory.js']);assert.ok(inventory['fixtures/quality/sparse-context.json']);assert.equal(inventory['src/inline-entry-review.json'],undefined);assert.throws(()=>preservedAccountIds.push('other'));
});
test('four actual synthetic ledger holds are observed without opening Store, changing bytes or granting readiness',t=>{
  const d=prepareInlineEntryHistory(t),before=bytes(d),v=inlineEntryPreflight({historyDirectory:d});assert.equal(v.reason,'paid_profile_and_explicit_approval_pending');assert.deepEqual(v.history,{checked:true,kind:'read_only_shape_observation_not_dispatch_admission',preservedUnknowns:4,heldMicroCny:'8812800',providerChargeKnown:false,accountMutation:false});assert.equal(v.ready,false);assert.deepEqual(bytes(d),before);assert.equal(fs.existsSync(path.join(d,'owner.lock')),false);
});
for(const mutation of ['amount','missing','extra','dispatched','settled','source','account','receipt'])test(`history ${mutation} blocks without mutating the observation`,t=>{
  const d=prepareInlineEntryHistory(t);change(d,v=>{const a=v.billing.accounts[preservedAccountIds[0]],r=Object.values(a.attempts)[0];if(mutation==='amount')r.chargedMicroCny='2203199';if(mutation==='missing')delete v.billing.accounts[preservedAccountIds[1]];if(mutation==='extra')v.billing.accounts['unrelated-unknown']={allowance:{id:'unrelated-unknown'},attempts:{[r.requestId]:structuredClone(r)}};if(mutation==='dispatched')r.status='dispatched';if(mutation==='settled')r.status='settled';if(mutation==='source')r.sourceRefs=[];if(mutation==='account')a.allowance.id='wrong';if(mutation==='receipt')r.requestId='mismatch';});
  const before=bytes(d),v=inlineEntryPreflight({historyDirectory:d});assert.equal(v.ready,false);assert.equal(v.history.checked,false);assert.equal(v.reason,mutation==='extra'?'unrelated_unsettled_attempt':mutation==='dispatched'?'history_requires_owner_or_recovery_review':mutation==='receipt'?'invalid_history_snapshot':'preserved_unknown_history_mismatch');assert.deepEqual(bytes(d),before);
});
for(const file of ['owner.lock','recovery.lock','snapshot.tmp'])test(`preflight never clears ${file} or attempts stale-owner recovery`,t=>{
  const d=prepareInlineEntryHistory(t);fs.writeFileSync(path.join(d,file),'synthetic-residue');const before=bytes(d),v=inlineEntryPreflight({historyDirectory:d});assert.equal(v.reason,'history_requires_owner_or_recovery_review');assert.deepEqual(bytes(d),before);
});
test('withdrawal and pending deletion block without body purge or journal replay',t=>{
  const d=prepareInlineEntryHistory(t);for(const [file,value,reason]of [['withdrawals.json',['q-sparse-memory'],'source_withdrawn'],['deletions.json',[{entryId:'synthetic'}],'history_requires_owner_or_recovery_review']]){fs.writeFileSync(path.join(d,file),JSON.stringify(value));const before=bytes(d);assert.equal(inlineEntryPreflight({historyDirectory:d}).reason,reason);assert.deepEqual(bytes(d),before);fs.writeFileSync(path.join(d,file),'[]');}
});
test('missing, malformed and oversized history stays read-only and never echoes local content',t=>{
  const d=temp(t),missing=path.join(d,'not-created');assert.equal(inlineEntryPreflight({historyDirectory:missing}).ready,false);assert.equal(fs.existsSync(missing),false);
  for(const body of ['SYNTHETIC-PRIVATE-SENTINEL','x'.repeat(2097153)]){fs.writeFileSync(path.join(d,'state.json'),body);const before=bytes(d),v=inlineEntryPreflight({historyDirectory:d});assert.equal(v.history.checked,false);assert.ok(!JSON.stringify(v).includes('SYNTHETIC-PRIVATE-SENTINEL'));assert.deepEqual(bytes(d),before);}
});
test('checkout and symlink directories/files cannot become history paths',t=>{
  const p=project(t),d=prepareInlineEntryHistory(t);assert.equal(inlineEntryPreflight({repositoryRoot:p,historyDirectory:p}).reason,'data_inside_checkout');const link=path.join(temp(t),'link');fs.symlinkSync(d,link,'dir');assert.equal(inlineEntryPreflight({historyDirectory:link}).reason,'unsafe_path');const actual=path.join(d,'saved-state.json');fs.renameSync(path.join(d,'state.json'),actual);fs.symlinkSync(actual,path.join(d,'state.json'));assert.equal(inlineEntryPreflight({historyDirectory:d}).reason,'unsafe_or_oversized_file');
});
for(const kind of ['changed','added','nested','removed','symlink'])test(`inventory ${kind} cannot silently reuse the reviewed source snapshot`,t=>{
  const d=project(t);if(kind==='changed')fs.appendFileSync(path.join(d,'src','inline-evidence-protocol.js'),'\n// drift\n');if(kind==='added')fs.writeFileSync(path.join(d,'src','unreviewed.json'),'{}');if(kind==='nested'){fs.mkdirSync(path.join(d,'src','nested'));fs.writeFileSync(path.join(d,'src','nested','unreviewed.js'),'export const changed=true;');}if(kind==='removed')fs.rmSync(path.join(d,'fixtures','quality','sparse-context.json'));if(kind==='symlink'){fs.renameSync(path.join(d,'fixtures'),path.join(d,'fixtures-original'));fs.symlinkSync(path.join(d,'fixtures-original'),path.join(d,'fixtures'),'dir');}const v=inlineEntryPreflight({repositoryRoot:d});assert.equal(v.sourceInventoryMatches,false);assert.equal(v.ready,false);
});
test('LF and CRLF source files keep the same inventory and next request bytes',t=>{
  const d=project(t),expected=inlineEntryInventory(d);for(const f of Object.keys(expected)){const p=path.join(d,f);fs.writeFileSync(p,fs.readFileSync(p,'utf8').replaceAll('\r\n','\n').replaceAll('\n','\r\n'));}assert.deepEqual(inlineEntryInventory(d),expected);const v=inlineEntryPreflight({repositoryRoot:d});assert.equal(v.sourceInventoryMatches,true);assert.equal(v.requestBytes,inlineEntryPreflight().requestBytes);
});
test('review metadata cannot turn this preparation into an approved profile',t=>{
  const d=project(t),p=path.join(d,'src','inline-entry-review.json'),original=fs.readFileSync(p,'utf8');for(const [k,v]of [['paidEvaluationApproved',true],['fixtureEgressApproved',true],['budgetCny',3],['pricing',{}],['liveEntryAvailable',true]]){const value=JSON.parse(original);value[k]=v;fs.writeFileSync(p,JSON.stringify(value));assert.equal(inlineEntryPreflight({repositoryRoot:d}).reason,'invalid_entry_review');}
});
test('CLI rejects live/init/key/budget flags, uses no default user directory and never reads a key or sends HTTP',()=>{
  const url=new URL('../src/inline-entry-preflight.js',import.meta.url).href;
  const code=`let keys=0,requests=0;const env=process.env;process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'||k==='LOCALAPPDATA'){keys++;throw Error('forbidden');}return Reflect.get(t,k);}});globalThis.fetch=()=>{requests++;throw Error('forbidden');};const m=await import(${JSON.stringify(url)});const v=m.inlineEntryPreflight();process.stdout.write(JSON.stringify({keys,requests,reason:v.reason}));`;
  const r=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),{keys:0,requests:0,reason:'history_directory_required'});
  for(const args of [['init'],['run','--live'],['preflight','--approve-budget-cny','3'],['preflight','--key','SYNTHETIC-SENTINEL']]){const c=spawnSync(process.execPath,['src/inline-entry-preflight.js',...args],{encoding:'utf8',timeout:15000});assert.equal(c.status,1);assert.ok(!(c.stdout+c.stderr).includes('SYNTHETIC-SENTINEL'));}
});
test('fixed rehearsal guards mutation APIs and reports only synthetic metadata',()=>{
  const r=spawnSync(process.execPath,['scripts/check-inline-entry-preflight.mjs'],{encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.syntheticUnknowns,4);assert.equal(v.historyBytesUnchanged,true);assert.equal(v.preflightMutationCalls,0);assert.equal(v.realModelRequests,0);assert.equal(v.credentialReads,0);assert.equal(v.pricingReviewed,false);assert.equal(v.budgetSelected,false);assert.equal(v.ready,false);assert.equal(v.liveEntryAvailable,false);
});

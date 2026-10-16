// Independent fictional counterexample and candidate policy. Not a production fix.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Nightvoyage} from '../src/engine.js';
import {InlineBudgetRehearsal} from './inline-budget-runtime.js';
import {inlineSeed,inlineResponse,inlineStubAllowance} from './inline-budget-fixtures.js';
import {fail} from '../src/store.js';
export const ownerPolicyVersion='offline-execution-owner-review-v1';
const foreignMarkers=['billingAllowanceId','billingProtocolVersion','appraisalProtocolVersion','stubAccountingVersion','stubAllowanceId','stubAllowanceHash','accountingMode'];
export function assertPlainFakeOwner(record){
  if(!record||typeof record!=='object'||Array.isArray(record)||foreignMarkers.some(k=>Object.hasOwn(record,k))||(Object.hasOwn(record,'executionOwner')&&(typeof record.executionOwner==='object'?record.executionOwner?.family!=='plain-fake-v1':record.executionOwner!=='plain-fake-v1')))fail('foreign_execution_owner');
}
export class ReviewedPlainFake extends Nightvoyage {
  execute(id){assertPlainFakeOwner(this.run(id));return super.execute(id);}
  resume(id,options){assertPlainFakeOwner(this.run(id));return super.resume(id,options);}
}
export function currentSourceInventory(){
  const src=new URL('../src/',import.meta.url),profile=JSON.parse(fs.readFileSync(new URL('continuity-trial-profile.json',src),'utf8'));
  const files=fs.readdirSync(src).filter(f=>f.endsWith('.js')).sort(),pinned=Object.keys(profile.protocolSourcePins).sort();let testSupportImports=0;
  for(const f of files){const body=fs.readFileSync(new URL(f,src),'utf8');if(/(?:from\s*|import\s*)['"][^'"]*test-support\//.test(body))testSupportImports++;}
  const exactTopLevelCoverage=JSON.stringify([...files,'coupled-trial-profile.json'].sort())===JSON.stringify(pinned),pinsMatch=Object.entries(profile.protocolSourcePins).every(([f,h])=>createHash('sha256').update(fs.readFileSync(new URL(f,src),'utf8').replaceAll('\r\n','\n')).digest('hex')===h);
  return {currentProductionJs:files.length,reviewedPins:pinned.length,exactTopLevelCoverage,pinsMatch,productionImportsTestSupport:testSupportImports,inventoryScope:'current_top_level_js_and_reviewed_prior_profile_not_future_recursive_closure'};
}
async function probe(root,guarded){
  const directory=path.join(root,guarded?'guarded':'current');let e,calls=0;
  try{
    e=new InlineBudgetRehearsal(directory,{allowance:inlineStubAllowance(),enabled:true,simulator:r=>{calls++;const response=inlineResponse(r);response.body.choices[0].message.content='{}';return response;}});const id=e.start('foreign','foreign',inlineSeed());await e.execute(id);assert.equal(e.status(id).status,'failed');assert.equal(e.rows(id)[0].status,'unknown');const ledger=JSON.stringify(e.store.state.inlineStubBilling);e.close();
    e=guarded?new ReviewedPlainFake(directory):new Nightvoyage(directory);const before=JSON.stringify(e.store.state.runs[id]);let rejected=false;try{await e.resume(id);}catch(error){assert.equal(error.message,'foreign_execution_owner');rejected=true;}
    assert.equal(JSON.stringify(e.store.state.inlineStubBilling),ledger);assert.equal(calls,1);
    assert.equal(rejected,true);assert.equal(JSON.stringify(e.store.state.runs[id]),before);assert.equal(e.result(id).dream,null);
    return {guarded,rejected,runStateUnchanged:true,fakeDreamPublished:false,syntheticUnknownHoldUnchanged:true,stubRequests:1};
  }finally{e?.close();}
}
export async function checkInlineIntegration(){
  const inventory=currentSourceInventory();assert.equal(inventory.pinsMatch,false);assert.equal(inventory.exactTopLevelCoverage,true);assert.equal(inventory.productionImportsTestSupport,0);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-integration-review-'));try{return {command:'node scripts/check-inline-integration.mjs',node:process.version,platform:process.platform,reviewVersion:ownerPolicyVersion,inventory,probes:[await probe(root,false),await probe(root,true)],finding:'generic_fake_resume_rejects_failed_foreign_record',productionFixApplied:true,productionIntegrationReady:false,realModelRequests:0,userStoreAccessed:false,paidProfileChanged:false,qualityAssessed:false,semanticSupport:'not_assessed'};}finally{fs.rmSync(root,{recursive:true,force:true});}
}

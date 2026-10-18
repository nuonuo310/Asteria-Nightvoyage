import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PortBackedApiRehearsal} from '../scripts/legacy-api-model-port.mjs';
import {BudgetedNightvoyage} from '../src/budgeted-runtime.js';
import {FakeProvider} from '../src/fake-provider.js';
import {inlineSeed,inlineResponse,inlineStubAllowance} from '../test-support/inline-budget-fixtures.js';
import {inlineProtocolVersion} from '../src/inline-evidence-protocol.js';
const seed=()=>{const s=inlineSeed();s.sources.forEach(v=>v.grant.modelEgress=true);return s;};
function setup(t,protocol='grounded-wake-v2',fault=()=>{}){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-legacy-port-')),calls=[],fake=new FakeProvider();
 const allowance={...inlineStubAllowance(),id:'fictional-legacy-model-port',...(protocol==='inline-evidence-v1'?{protocolVersion:inlineProtocolVersion}:{})};
 const options={allowance,enabled:true,mode:'stub',protocol,credential:'DUMMY-FIXTURE-NOT-A-CREDENTIAL',fault,fetchImpl:async(_url,request)=>{
   calls.push(1);const body=JSON.parse(request.body);
   if(protocol==='inline-evidence-v1')return new Response(JSON.stringify(inlineResponse({body}).body));
   const m=JSON.parse(body.messages[1].content),value=m.stage==='wake'?{fragment:m.previousScenes[1].event,residue:.1,associations:[]}:await fake.generate({stage:m.stage,index:m.sceneIndex});
   return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(value)}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}}));
 }};
 let engine;const open=()=>engine=new PortBackedApiRehearsal(directory,options);t.after(()=>{engine?.close();fs.rmSync(directory,{recursive:true,force:true});});return {directory,options,open,calls};
}
for(const protocol of ['grounded-wake-v2','inline-evidence-v1'])test(`legacy ${protocol} crosses model port with unchanged atomic ledger, typed output, dedup and withdrawal`,async t=>{
 const {open,calls,directory}=setup(t,protocol);let e=open();const id=e.start('legacy','legacy',seed());await e.execute(id);const r=e.result(id);assert.equal(r.receipt.status,'completed');assert.equal(calls.length,3);assert.equal(r.receipt.adapter_kind,'LegacyDeepSeekAdapter');assert.equal(r.receipt.auth_mode,'synthetic_stub');assert.equal(r.receipt.external_calls_started,0);assert.equal(r.receipt.billing.length,3);assert.ok(r.receipt.billing.every(v=>v.status==='settled'));assert.equal(r.receipt.usage[0].usage.input_tokens,100);assert.equal(r.dream.isRealityFact,false);
 const billing=structuredClone(e.store.state.billing);e.close();e=open();assert.equal(e.start('legacy','legacy',seed()),id);await e.execute(id);assert.equal(calls.length,3);assert.deepEqual(e.store.state.billing,billing);
 e.withdraw(seed().sources[0].id);e.close();e=open();assert.equal(e.result(id).dream,null);assert.deepEqual(e.store.state.billing,billing);const disk=fs.readFileSync(path.join(directory,'state.json'),'utf8');assert.ok(!disk.includes('DUMMY-FIXTURE'));assert.ok(!disk.includes(r.dream.scenes[0].event));
});
test('legacy API mode refuses live/default construction before opening storage or dispatch',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-no-api-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const directory=path.join(root,'absent');
 for(const options of [{},{mode:'live'},{mode:'stub',allowance:{mode:'live'}},{mode:'stub',allowance:{mode:'stub'},protocol:'compact-appraisal-v1'}])assert.throws(()=>new PortBackedApiRehearsal(directory,options),/legacy_api_rehearsal_only/);assert.equal(fs.existsSync(directory),false);
});
test('legacy port does not adopt existing specialized run identity or reinterpret prior billing',async t=>{
 const {options,directory,open}=setup(t),old=new BudgetedNightvoyage(directory,options);const id=old.start('old','old',seed());await old.execute(id);const billing=structuredClone(old.store.state.billing);old.close();const e=open();await assert.rejects(e.execute(id),/foreign_execution_owner/);assert.deepEqual(e.store.state.billing,billing);
});
test('legacy response validation failure retains unknown full reservation and never repairs',async t=>{
 const {options,open,calls}=setup(t,'inline-evidence-v1');options.fetchImpl=async()=>{calls.push(1);return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:'{}'}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));};
 const e=open(),id=e.start('bad','bad',seed());await e.execute(id);const row=e.status(id).billing[0];assert.equal(calls.length,1);assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,row.reservedMicroCny);assert.equal(e.result(id).dream,null);assert.throws(()=>e.resume(id),/committed_prefix/);await e.execute(id);assert.equal(calls.length,1);
});
test('legacy adapter forwards cancellation and suppresses a late simulated response without settlement',async t=>{
 const {options,open,calls}=setup(t);let entered,release;const started=new Promise(r=>entered=r),transport=options.fetchImpl;
 options.fetchImpl=async(...args)=>{entered();await new Promise(r=>release=r);return transport(...args);};
 const e=open(),id=e.start('cancel','cancel',seed()),work=e.execute(id);await started;e.cancel(id);await work;release();await new Promise(r=>setImmediate(r));assert.equal(e.result(id).dream,null);assert.equal(e.status(id).billing[0].status,'unknown');assert.equal(calls.length,1);assert.equal(e.status(id).billing[0].chargedMicroCny,e.status(id).billing[0].reservedMicroCny);
});

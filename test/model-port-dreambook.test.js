import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ModelPortNightvoyage} from '../scripts/dream-model-runtime.mjs';
import {ChatGPTPlanAdapter,CodexAdapter,selectAdapter,FakeAdapter} from '../scripts/dream-model-port.mjs';
import {runDreambook} from '../scripts/dreambook.mjs';
import {readModelPortContent} from '../scripts/model-port-content-view.mjs';
import {planTranscript,codexTranscript} from '../test-support/model-port-protocol-fixtures.js';
const seed=()=>JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),'utf8'));
function setup(t,adapter=new FakeAdapter()){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-port-reader-')),directory=path.join(root,'book'),selection=selectAdapter({primary:adapter});let e;
 const open=()=>e=new ModelPortNightvoyage(directory,{selection});t.after(()=>{e?.close();fs.rmSync(root,{recursive:true,force:true});});return{directory,open};
}
for(const adapter of [new FakeAdapter(),new ChatGPTPlanAdapter({model_id:'fiction-model',simulator:draft=>planTranscript(draft)}),new CodexAdapter({model_id:'fiction-model',simulator:draft=>codexTranscript(draft)})])test(`${adapter.identity.adapter_kind} saved book is readable without fake API metadata and withdraws after reopen`,async t=>{
 const {directory,open}=setup(t,adapter);let e=open();const id=e.start('reader','reader',seed());await e.execute(id);const dream=e.result(id).dream,original=JSON.stringify(e.read(dream.id));assert.equal(e.run(id).billingProtocolVersion,undefined);e.close();
 const catalog=JSON.parse(runDreambook(['list','--data-dir',directory]));assert.equal(catalog.dreams[0].protocolSupported,true);assert.equal(catalog.dreams[0].protocolVersion,'dream-model-port-v1');
 const text=runDreambook(['read','--latest','--data-dir',directory]);assert.ok(text.includes(dream.scenes[0].event));assert.ok(text.includes('不是现实事实'));assert.ok(text.includes('【醒来残片】'));assert.ok(text.includes('【已有独立评审意见】'));
 e=open();assert.equal(JSON.stringify(e.read(dream.id)),original);assert.equal(e.status(id).stage_dispatches_started,3);e.withdraw(seed().sources[0].id);e.close();assert.equal(JSON.parse(runDreambook(['list','--data-dir',directory])).dreams.length,0);assert.ok(runDreambook(['read','--latest','--data-dir',directory]).includes('没有可查看'));
});
test('new reader rejects forged ownership, provenance or scene chains without changing saved original',async t=>{
 const {open}=setup(t),e=open(),id=e.start('bad','bad',seed());await e.execute(id);const entry=e.result(id).dream.id,run=e.run(id),saved=structuredClone(run),original=e.read(entry);
 for(const change of [()=>run.modelSelection.model_id='forged-model',()=>run.executionOwner.family='plain-fake-v1',()=>run.scenes[0].after.valence=.9,()=>e.store.state.entries[entry].sourceRefs[0].version='forged']){
  change();assert.throws(()=>readModelPortContent(e.store,entry));Object.assign(run,structuredClone(saved));e.store.state.entries[entry]=structuredClone(original);
 }
 e.store.state.entries[entry].unreviewedExtra='UNREVIEWED_BODY_SENTINEL';e.store.state.entries[entry].wake.unreviewedExtra='UNREVIEWED_BODY_SENTINEL';
 assert.ok(!JSON.stringify(readModelPortContent(e.store,entry)).includes('UNREVIEWED_BODY_SENTINEL'));e.store.state.entries[entry]=structuredClone(original);assert.deepEqual(e.read(entry),original);
});
test('new reader refuses rather than hide an unsupported independent review for this owner',async t=>{
 const {open}=setup(t),e=open(),id=e.start('review','review',seed());await e.execute(id);const entry=e.result(id).dream.id;
 e.store.state.entries['independent-review']={origin:'dream_appraisal_review',runId:id,derivedFrom:[entry]};assert.throws(()=>readModelPortContent(e.store,entry),/review_reader_pending/);
});

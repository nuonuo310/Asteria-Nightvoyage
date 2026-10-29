import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {launchInlinePaid} from '../src/inline-paid-entry.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const cli=path.join(root,'src/inline-paid-entry.js');
function temporary(t){
  const value=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-paid-closeout-'));
  t.after(()=>fs.rmSync(value,{recursive:true,force:true}));
  return value;
}

test('old paid actions refuse under the new source identity before credential, network, Store or lock',async t=>{
  const parent=temporary(t),storePath=path.join(parent,'absent-store');
  let supplierCalls=0,parentFetchCalls=0;
  const nativeFetch=globalThis.fetch;
  globalThis.fetch=()=>{parentFetchCalls++;throw Error('network_forbidden');};
  try{
    for(const action of ['proposal','preflight','read','revoke','rehearse','run','resume']){
      let value,error;
      try{
        value=await launchInlinePaid(action,storePath,{credentialSupplier:()=>{supplierCalls++;return 'SENTINEL-MUST-NOT-LEAVE';}});
      }catch(caught){error=caught;}
      assert.equal(error?.message??value?.reason,'inline_paid_entry_refused',action);
      if(value){
        assert.equal(value.ready,false,action);
        assert.equal(value.credentialRequested,false,action);
        assert.equal(value.credentialSupplierCalls,0,action);
      }
    }
  }finally{globalThis.fetch=nativeFetch;}
  assert.equal(supplierCalls,0);
  assert.equal(parentFetchCalls,0);
  assert.equal(fs.existsSync(storePath),false);
  assert.equal(fs.existsSync(path.join(storePath,'state.json')),false);
  assert.equal(fs.existsSync(path.join(storePath,'owner.lock')),false);
  assert.deepEqual(fs.readdirSync(parent),[]);
});

test('the old CLI rejects broad or live-shaped requests without printing a secret or success receipt',()=>{
  const environment={...process.env,NIGHTVOYAGE_DEEPSEEK_KEY:'DUMMY-SENTINEL-MUST-NOT-APPEAR'};
  for(const args of [
    ['init'],
    ['run'],
    ['run','--data-dir',path.join(os.tmpdir(),'nightvoyage-absent-paid-store'),'--live'],
    ['run','--live','--key','PRIVATE-SENTINEL'],
    ['preflight','--transport','arbitrary'],
    ['init','--approve-budget-cny','4']
  ]){
    const result=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:20000,env:environment});
    assert.equal(result.status,1,JSON.stringify(args));
    assert.equal(result.stdout,'',JSON.stringify(args));
    assert.equal(result.stderr.trim(),'inline_paid_entry_refused',JSON.stringify(args));
    assert.equal(result.stdout.includes('PRIVATE-SENTINEL'),false);
    assert.equal(result.stderr.includes('PRIVATE-SENTINEL'),false);
    assert.equal(result.stdout.includes('DUMMY-SENTINEL-MUST-NOT-APPEAR'),false);
  }
});

test('the closeout keeps the old paid graph on its base contract pin and outside the new modules',()=>{
  const graph=JSON.parse(fs.readFileSync(path.join(root,'src','inline-paid-graph.json'),'utf8'));
  const source=fs.readFileSync(path.join(root,'src','contract.js'),'utf8').replace(/\r\n/g,'\n');
  const actual=createHash('sha256').update(source).digest('hex');
  assert.equal(graph.kind,'parse_only_static_esm_graph');
  assert.equal(graph.evaluated,false);
  assert.equal(graph.dynamicImportClosureProved,false);
  assert.equal(actual,graph.files['src/contract.js']);
  assert.equal(actual,'850c99572c39930eac150588e379c9af90b5e792159ae46a04f9fad0f9d52ca7');
  assert.equal(Object.hasOwn(graph.files,'src/dream-climate-protocol.js'),false);
  assert.equal(Object.hasOwn(graph.files,'src/generated-wake-runtime.js'),false);
  assert.equal(Object.hasOwn(graph.files,'src/generated-wake-protocol.js'),false);
  assert.equal(Object.hasOwn(graph.files,'src/generated-wake-records.js'),false);
});

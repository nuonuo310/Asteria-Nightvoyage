// Current checkout, independently fabricated history. No user's Store or response.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {prepareCoupledHistory} from '../test-support/coupled-trial-fixtures.js';
import {BudgetedNightvoyage} from '../src/budgeted-runtime.js';
import {continuityResponse} from '../test-support/continuity-runtime-fixtures.js';
import {coupledTrialId,coupledTrialInput,coupledTrialPreflight,coupledTrialPinsMatch,initCoupledTrial} from '../src/coupled-trial-config.js';
const profile=JSON.parse(fs.readFileSync(new URL('../src/coupled-trial-profile.json',import.meta.url),'utf8'));
for(const completed of [true,false])test(`current sources block historical dispatch but read ${completed?'completed':'failed'} coupled history without credentials`,async t=>{
  const d=prepareCoupledHistory(t),native=globalThis.fetch,clock=Date.now;let calls=0,e;
  try{
    Date.now=()=>profile.allowance.pricing.checkedAt+1000;
    globalThis.fetch=async(_url,r)=>{calls++;const response=continuityResponse({body:JSON.parse(r.body)});if(!completed)response.body.choices[0].message.content='{}';return new Response(JSON.stringify(response.body));};
    // Fabricate an old live-mode account using a local simulator, never native HTTP.
    e=new BudgetedNightvoyage(d,{allowance:profile.allowance,mode:'live',enabled:true,protocol:'coupled-affect-v1',credential:'DUMMY-HISTORY'});
    e.store.atomic(`${coupledTrialId}.json`,profile);const id=e.start(coupledTrialId,coupledTrialId,coupledTrialInput(profile));await e.execute(id);
    assert.equal(e.status(id).status,completed?'completed':'failed');e.close();
  }finally{globalThis.fetch=native;Date.now=clock;}
  const before=fs.readFileSync(path.join(d,'state.json'),'utf8');assert.equal(coupledTrialPinsMatch(),false);
  assert.throws(()=>initCoupledTrial(d,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,acknowledgePreservedHolds:true,now:profile.allowance.pricing.checkedAt+1000}),/coupled_protocol_source_changed/);
  const state=coupledTrialPreflight(d,profile.allowance.pricing.checkedAt+1000);assert.equal(state.ready,false);assert.equal(state.reason,'coupled_protocol_source_changed');
  const preload=`const env=process.env;process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY')throw Error('forbidden credential read');return Reflect.get(t,k);}});globalThis.fetch=()=>{throw Error('forbidden HTTP');};`;
  for(const args of [['read'],['run','--live']]){
    const r=spawnSync(process.execPath,['--import',`data:text/javascript,${encodeURIComponent(preload)}`,'src/coupled-trial-cli.js',...args,'--data-dir',d],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
    assert.equal(r.status,args[0]==='read'||completed?0:1,r.stderr);assert.ok(!r.stderr.includes('forbidden'));
    if(r.status===0){const view=JSON.parse(r.stdout);assert.equal(view.receipt.status,completed?'completed':'failed');if(completed)assert.equal(view.appraisalView.status,'available');}
  }
  assert.equal(fs.readFileSync(path.join(d,'state.json'),'utf8'),before);assert.equal(calls,completed?3:1);
});

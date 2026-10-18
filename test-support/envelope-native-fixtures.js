// Synthetic OAuth/HTTP only. These flags are test setup, never real user consent.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {withCheckedPlanSession} from '../scripts/chatgpt-plan-login.mjs';
import {createEnvelopeHttpTransport} from '../scripts/envelope-plan-http.mjs';
import {EnvelopePlanAdapter,selectAdapter} from '../scripts/envelope-plan-model-port.mjs';
import {ModelPortNightvoyage} from '../scripts/envelope-plan-model-runtime.mjs';
import {syntheticPlanHttp} from './plan-trial-fixtures.js';
import {envelopeTranscript} from './offline-envelope-runtime-fixtures.js';
import {hash,snapshot} from '../src/contract.js';
export function nativeEnvelopeSeed(){const s=JSON.parse(fs.readFileSync(new URL('../examples/gpt-plan-trial.snapshot.json',import.meta.url),'utf8'));for(const source of s.sources)source.grant.modelEgress=true;return snapshot(s);}
export async function withSyntheticNativeEnvelope(action,{onGenerate,denied=false,revocationFail=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-envelope-native-')),directory=path.join(root,'book'),connectionDirectory=path.join(root,'connection');let engine,modelAdapter,actionError;
 const http=syntheticPlanHttp({denied,revocationFail,onGenerate:onGenerate??(body=>new Response(Buffer.concat(envelopeTranscript({body}))))});http.install();
 try{
  const authorization=await withCheckedPlanSession({directory:connectionDirectory,onReady:http.onReady},async session=>{
   const input=nativeEnvelopeSeed();
   const authorize=request=>{
    engine.store.assert();const run=engine.run(request.run_id),attempt=run.attempts.at(-1);
    if(engine.store.withdrawn.some(id=>request.snapshot.sources.some(s=>s.id===id)))throw Error('source_withdrawn');
    assert.equal(run.status,'running');assert.equal(attempt.state,'dispatched');assert.equal(attempt.request_id,request.request_id);assert.equal(attempt.external_call_intent,true);assert.equal(hash(request.snapshot),hash(input));assert.ok(run.attempts.length<=3);
   };
   const transport=createEnvelopeHttpTransport({session,model:'gpt-5.6-sol',authorize,allowMissingContentType:true,allowReasoningDiscard:true});
   modelAdapter=new EnvelopePlanAdapter({model_id:'gpt-5.6-sol',httpTransport:transport});
   const selection=selectAdapter({primary:modelAdapter});
   engine=new ModelPortNightvoyage(directory,{selection});
   try{return await action({engine,input,http,root,directory,connectionDirectory,session,transport,adapter:modelAdapter,selection});}catch(error){actionError=error;throw error;}
  });
  if(actionError)throw actionError;
  assert.equal(authorization.status,'plan_action_finished');return {authorization,modelAdapter};
 }finally{engine?.close();http.restore();fs.rmSync(root,{recursive:true,force:true});}
}

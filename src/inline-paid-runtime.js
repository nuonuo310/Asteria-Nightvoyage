// Dedicated contract-bound runtime. No credential/environment or endpoint override.
import https from 'node:https';
import {BudgetedNightvoyage} from './budgeted-runtime.js';
import {GatedDeepSeekClient} from './gated-deepseek-client.js';
import {copy,fail} from './store.js';
import {hash} from './contract.js';
import {maximumCost} from './budget-ledger.js';
import {buildInlineRequest} from './inline-evidence-protocol.js';
import {readInlineTrialAuthorization,requireInlineTrialAuthorization,inlineTrialInput,inlineTrialRunConfig,assertInlineTrialStage,revokeInlineTrialAuthorization,inlineTrialAuthorizationVersion} from './inline-trial-authorization.js';
const checked=store=>{const r=readInlineTrialAuthorization(store);if(r.mode!=='live'||r.terms.contract.implementationReady!==true||r.terms.contract.source.paidGraphAvailable!==true||r.terms.confirmation.accountCurrency!=='CNY')fail('paid_runtime_authorization_required');return r;};
function rehearsalResponse(body){
  const m=JSON.parse(JSON.parse(body).messages[1].content),events=['梦里的人把绿色钥匙放在窗台，玻璃映着一只风筝。','梦里的人退后半步，窗台上的钥匙没有移动，风筝的影子淡了。'];
  const data=m.stage==='wake'?{fragment:m.previousScenes[0].event,residue:.1,associations:[]}:{event:events[m.sceneIndex],appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}};
  return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));
}
function providerResponse(endpoint,request){
  return new Promise((resolve,reject)=>{
    let done=false,req;const stop=()=>{if(done)return;done=true;try{req?.destroy();}catch{}reject(Error('provider_transport_failed'));};
    try{
      req=https.request(endpoint,{method:'POST',headers:request.headers,signal:request.signal,agent:false},response=>{
        response.on('error',stop);
        if(response.statusCode!==200){if(!done){try{const result=new Response(null,{status:response.statusCode});done=true;try{response.destroy();}catch{}resolve(result);}catch{stop();}}return;}
        const chunks=[];let bytes=0;
        response.on('data',chunk=>{if(done)return;bytes+=chunk.length;if(bytes>65536){try{response.destroy();}catch{}stop();}else chunks.push(Buffer.from(chunk));});
        response.on('aborted',stop);
        response.on('end',()=>{if(done)return;done=true;resolve(new Response(Buffer.concat(chunks),{status:200}));});
      });req.on('error',stop);req.end(request.body);
    }catch{stop();}
  });
}
class PaidClient extends GatedDeepSeekClient{
  #issued=new Set();
  static assertInlineLiveConstruction(store){checked(store);}
  assertInlineLiveSend(){checked(this.store);if(this.mode!=='live')fail('paid_runtime_mode_mismatch');}
  checkAdmission(context,phase){try{if(this.mode!=='live'||this.protocol!=='inline-evidence-v1')fail('paid_runtime_mode_mismatch');assertInlineTrialStage(this.store,context,phase,{mode:'live'});}catch(error){if(!['source_withdrawn','paid_contract_expired','trial_authorization_revoked','ambiguous_attempt'].includes(error.message))this.store.poisoned=true;throw error;}}
  send(args){if(typeof args?.publish!=='function')fail('managed_publication_required');return super.send({...args,payload:copy(args.payload)});}
  checkProviderBody(body,credential){
    const scan=value=>{if(typeof value==='string'&&value.includes(credential))fail('provider_secret_echo');if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){scan(key);scan(child);}};
    scan(body);
    // The completion is JSON within the HTTP JSON; inspect decoded strings too.
    const content=body?.choices?.[0]?.message?.content;
    if(typeof content==='string'){let data;try{data=JSON.parse(content);}catch{}scan(data);}
  }
  dispatchTransport(endpoint,request,context){
    const r=assertInlineTrialStage(this.store,context,'before_http',{mode:'live'}),key=context.requestId;
    const expected=buildInlineRequest(context.payload,{model:'deepseek-flash',maxOutputTokens:400});
    if(this.#issued.has(key)||endpoint!==r.terms.contract.provider.endpoint||request.body!==JSON.stringify(expected.body)||request.method!=='POST'||request.redirect!=='error')fail('paid_transport_contract_mismatch');this.#issued.add(key);
    return r.terms.dispatchKind==='rehearsal'?rehearsalResponse(request.body):providerResponse(endpoint,request);
  }
}
export class InlinePaidRuntime extends BudgetedNightvoyage{
  static assertInlineLiveConstruction(directory,allowance){const r=requireInlineTrialAuthorization(directory,{mode:'live'});if(hash(allowance)!==hash(r.terms.allowance)||r.terms.contract.implementationReady!==true)fail('paid_runtime_authorization_required');}
  constructor(directory,options={}){
    if(!options||Object.keys(options).some(k=>!['enabled','timeoutMs','fault'].includes(k)))fail('paid_runtime_override_forbidden');
    const record=requireInlineTrialAuthorization(directory,{mode:'live'});
    super(directory,{...options,allowance:record.terms.allowance,mode:'live',protocol:'inline-evidence-v1'});
    try{const r=checked(this.store);this.provider.identity+=`:${inlineTrialAuthorizationVersion}:${r.termsHash}`;}catch(error){this.client.close();this.store.close();throw error;}
  }
  beforeBudgetAccount(){return checked(this.store).terms.allowance;}
  createBudgetClient(options){return new PaidClient(this.store,options);}
  initialRunMetadata(){const r=checked(this.store);return {...super.initialRunMetadata(),trialAuthorizationVersion:inlineTrialAuthorizationVersion,trialAuthorizationHash:r.termsHash};}
  assertRunIdentity(id){const r=checked(this.store);super.assertRunIdentity(id);if(this.run(id).trialAuthorizationVersion!==inlineTrialAuthorizationVersion||this.run(id).trialAuthorizationHash!==r.termsHash)fail('trial_authorized_stage_mismatch');}
  start(...args){if(args.length)fail('fixed_trial_run_required');const r=checked(this.store);return super.start(r.terms.requestId,r.terms.sessionId,inlineTrialInput(),r.terms.runConfig);}
  prepare({resume=false,dispatchKind,create=true}={}){
    const r=checked(this.store);if(r.terms.dispatchKind!==dispatchKind)fail('trial_dispatch_kind_mismatch');
    if(resume&&!this.store.state.requests[r.terms.requestId])fail('explicit_resume_requires_existing_run');
    if(!create&&!this.store.state.requests[r.terms.requestId]){
      const state=this.client.ledger.status(this.allowanceId);if(state.calls||state.runs)fail('trial_stage_reservation_mismatch');
      const request=buildInlineRequest({stage:'scene',index:0,snapshot:inlineTrialInput(),scenes:[]},{model:'deepseek-flash',maxOutputTokens:400});
      return {completed:false,id:null,contractHash:r.terms.contractHash,termsHash:r.termsHash,nextRequestBytes:Buffer.byteLength(JSON.stringify(request.body)),nextReservationMicroCny:maximumCost(r.terms.allowance.pricing,400).toString()};
    }
    const id=this.start(),run=this.run(id);this.assertExecutionOwner(run);this.assertRunIdentity(id);
    if(run.status==='completed')return {completed:true,id};
    if(hash(run.config)!==hash(inlineTrialRunConfig())||hash(run.snapshot)!==hash(inlineTrialInput()))fail('trial_authorized_stage_mismatch');
    if(resume){if(!['uncertain','failed'].includes(run.status))fail('not_resumable');this.assertInlineResumePrefix(id);}else if(run.status!=='queued')fail('explicit_resume_required');
    const state=this.client.ledger.status(this.allowanceId),rows=state.attempts;
    if(rows.some(row=>row.runId!==id||row.status!=='settled'))fail('ambiguous_attempt');
    if(rows.length!==run.scenes.length||run.attempts.length!==run.scenes.length)fail('trial_stage_reservation_mismatch');
    const cost=maximumCost(r.terms.allowance.pricing,400);
    if(state.calls>=3||BigInt(state.heldOrSpentMicroCny)+cost>3000000n||rows.reduce((n,t)=>n+t.usage.inputTokens,0)+1100000>run.config.inputTokens||rows.reduce((n,t)=>n+t.usage.outputTokens,0)+400>run.config.outputTokens)fail('allowance_exhausted');
    const request=buildInlineRequest({stage:run.scenes.length<2?'scene':'wake',index:run.scenes.length,snapshot:run.snapshot,scenes:run.scenes},{model:'deepseek-flash',maxOutputTokens:400});
    return {completed:false,id,contractHash:r.terms.contractHash,termsHash:r.termsHash,nextRequestBytes:Buffer.byteLength(JSON.stringify(request.body)),nextReservationMicroCny:cost.toString()};
  }
  revokeAuthorization(){const r=revokeInlineTrialAuthorization(this.store);this.client.close();return r;}
}

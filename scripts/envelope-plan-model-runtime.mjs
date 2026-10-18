// Reuses the existing Store and dream lifecycle; the model boundary is replaceable.
// Ready adapters share this lifecycle. Subscription adapters currently remain gated.
import {planResponseDiagnostic,reviewedPlanResponseDiagnostic} from './plan-response-diagnostic.mjs';
import {Nightvoyage} from '../src/engine.js';
import {hash,snapshot} from '../src/contract.js';
import {dreamModelPortVersion,selectAdapter,stageRequest,validateStageResponse,jsonFields,portError,isModelSelection} from './envelope-plan-model-port.mjs';
const fail=code=>{throw Error(code);};
export class ModelPortNightvoyage extends Nightvoyage {
  #selection;
  constructor(directory,{selection=selectAdapter(),fault=()=>{}}={}){
    if(!isModelSelection(selection))fail('invalid_model_selection');
    if(!selection?.ready)fail(selection?.reason??'authorization_required');
    // Require a module-issued selection and current local readiness.
    if(!selection.adapter.preflight().ready)fail('adapter_unavailable');
    super(directory,{fault});this.#selection=selection;
    Object.defineProperty(this.provider,'identity',{value:hash({port:dreamModelPortVersion,identity:selection.adapter.identity,selection:selection.selection_id})});
    try{for(const r of Object.values(this.store.state.runs))this.assertExecutionOwner(r);}
    catch(error){this.store.close();throw error;}
  }
  executionFamily(){return 'dream-model-port-v1';}
  initialRunMetadata(){return {modelPortVersion:dreamModelPortVersion,modelSelection:{...this.#selection.adapter.identity,fallback_from:this.#selection.fallback_from,fallback_reason:this.#selection.fallback_reason,selection_id:this.#selection.selection_id}};}
  start(requestId,sessionId,input,settings={}){
    jsonFields(input,['id','version','materialKind','sources','channels']);
    jsonFields(settings,[],['scenes','maxCalls','inputTokens','outputTokens','perCallOutput','timeoutMs']);
    snapshot(input);if(settings.scenes!==undefined&&settings.scenes!==2)fail('two_scenes_required');
    return super.start(requestId,sessionId,input,settings);
  }
  assertExecutionOwner(r){
    super.assertExecutionOwner(r);
    if(hash(r.modelSelection)!==hash(this.initialRunMetadata().modelSelection)||r.modelPortVersion!==dreamModelPortVersion)fail('foreign_execution_owner');
  }
  status(id){
    const r=this.run(id);this.assertExecutionOwner(r);const receipt=super.status(id),attempts=r.attempts??[];
    return {...receipt,...structuredClone(r.modelSelection),contract_version:dreamModelPortVersion,error_category:['failed','uncertain'].includes(r.status)?(r.modelPortError??(r.status==='uncertain'?'ambiguous_attempt':portError({message:receipt.error}))):null,external_calls_started:attempts.filter(a=>a.external_call_intent).length,stage_dispatches_started:attempts.length,
      validation_diagnostic:reviewedPlanResponseDiagnostic(r.modelPortDiagnostic),
      checkpoint:{saved_scenes:r.scenes?.length??0,wake_saved:r.status==='completed',last_committed:attempts.filter(a=>a.state==='committed').at(-1)?.request_id??null},
      usage:attempts.map(a=>({request_id:a.request_id,usage:a.usage??'unknown'})),cancellation:{local_suppressed:['cancelled','revoked'].includes(r.status),remote_confirmed:'unknown'},
      budget:{...receipt.budget,kind:'local_json_byte_guards',units:'UTF-8 JSON bytes; not model tokens',money:this.#selection.adapter.capabilities.external_generation?'unknown':'not_applicable_fake'}};
  }
  async resume(id,options={}){
    jsonFields(options,[]);const r=this.run(id);this.assertExecutionOwner(r);
    if(!['failed','uncertain'].includes(r.status))fail('not_resumable');
    if(!r.scenes?.length||r.attempts.length!==r.scenes.length||r.attempts.some((a,i)=>a.state!=='committed'||a.stage!=='scene'||a.index!==i))fail('ambiguous_attempt');
    delete r.modelPortError;delete r.modelPortDiagnostic;return super.resume(id,{retryUnknown:true});
  }
  async stage(r,stage,signal){
    this.assertExecutionOwner(r);if(this.#selection.adapter.capabilities.external_generation&&r.snapshot.sources.some(s=>s.grant.modelEgress!==true))fail('source_egress_denied_or_withdrawn');
    if(r.status!=='running'||signal.aborted)fail('cancelled');
    const request=stageRequest({contract_version:dreamModelPortVersion,request_id:`stage-${r.id}-${stage}-${r.scenes.length}`,run_id:r.id,stage,index:r.scenes.length,snapshot:structuredClone(r.snapshot),scenes:structuredClone(r.scenes)});
    const inputBytes=Buffer.byteLength(JSON.stringify(request)),outputBytes=r.config.perCallOutput*3;
    if(r.budget.calls+1>r.config.maxCalls||r.budget.input+inputBytes>r.config.inputTokens*3||r.budget.output+outputBytes>r.config.outputTokens*3)fail('budget_exhausted');
    if(r.attempts.some(a=>a.request_id===request.request_id))fail('ambiguous_attempt');
    const attempt={request_id:request.request_id,stage,index:r.scenes.length,state:'dispatched',external_call_intent:this.#selection.adapter.capabilities.external_generation,usage:'unknown'};
    r.attempts.push(attempt);r.budget.calls++;r.budget.input+=inputBytes;r.budget.output+=outputBytes;
    // Durable intent precedes adapter invocation. Crash here is conservative/ambiguous.
    this.store.save();this.fault('port_dispatched');
    const controller=new AbortController();let timer,onAbort;
    const active=()=>{this.store.assert();if(signal.aborted||controller.signal.aborted||r.status!=='running')fail('cancelled');if(request.snapshot.sources.some(s=>this.store.withdrawn.includes(s.id)))fail('source_withdrawn');this.assertExecutionOwner(r);};
    try{
      const stopped=new Promise((_,reject)=>{
        onAbort=()=>{controller.abort();reject(Error('cancelled'));};signal.addEventListener('abort',onAbort,{once:true});
        timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},r.config.timeoutMs);
      });
      const raw=await Promise.race([Promise.resolve().then(()=>{active();return this.#selection.adapter.generate(structuredClone(request),{signal:controller.signal});}),stopped]);active();
      // Reject executable objects before JSON serialization can invoke getters/toJSON.
      jsonFields(raw,['value','usage']);if(Buffer.byteLength(JSON.stringify(raw))>outputBytes)fail('invalid_model_response');
      const result=validateStageResponse(raw,request);active();
      if(stage==='scene')r.scenes.push(result.value);else{r.wake=result.value;this.publishDream(r);}
      attempt.state='committed';attempt.usage=result.usage;
      // Checkpoint and usage commit together, never store an unvalidated provider body.
      this.store.save();this.fault(stage==='scene'?'port_scene_saved':'port_wake_saved');
    }catch(error){controller.abort();if(!this.store.poisoned&&r.status==='running'){r.modelPortError=portError(error);const diagnostic=planResponseDiagnostic(error);if(diagnostic)r.modelPortDiagnostic=diagnostic;}throw error;}
    finally{clearTimeout(timer);signal.removeEventListener('abort',onAbort);}
  }
  sceneStep(r,signal){return this.stage(r,'scene',signal);}
  wakeStep(r,signal){return this.stage(r,'wake',signal);}
}

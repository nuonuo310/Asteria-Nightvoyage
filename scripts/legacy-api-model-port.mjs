// Explicit compatibility adapter: retains the existing API ledger and validators.
// This new integration is rehearsal-only; historical paid entries are untouched.
import {GatedDeepSeekClient} from '../src/gated-deepseek-client.js';
import {BudgetedNightvoyage} from '../src/budgeted-runtime.js';
import {dreamModelPortVersion,stageRequest} from './dream-model-port.mjs';
const fail=code=>{throw Error(code);};
export class LegacyDeepSeekAdapter {
  #client;
  constructor(client){
    if(!(client instanceof GatedDeepSeekClient)||client.mode!=='stub'||!['grounded-wake-v2','inline-evidence-v1'].includes(client.protocol))fail('legacy_api_rehearsal_only');
    this.#client=client;
    Object.defineProperty(this,'identity',{value:Object.freeze({adapter_kind:'LegacyDeepSeekAdapter',provider_kind:'deepseek_api',model_id:'deepseek-flash',auth_mode:'synthetic_stub',protocol_version:client.protocolVersion}),enumerable:true});
  }
  preflight(){return {ready:this.#client.enabled===true,reason:this.#client.enabled===true?'ready':'adapter_unavailable'};}
  async generate(input,{signal,accounting}={}){
    const r=stageRequest(input);
    if(r.stage_schema!==(this.#client.protocol==='inline-evidence-v1'?'inline-evidence-v1':'legacy-grounded-wake-v2'))fail('legacy_stage_schema_required');
    const result=await this.#client.send({...accounting,requestId:r.request_id,runId:r.run_id,signal,payload:{snapshot:r.snapshot,scenes:r.scenes,stage:r.stage,index:r.index}});
    const u=result.receipt?.usage;
    return {value:result.generated?.value??null,usage:u?{input_tokens:u.inputTokens,output_tokens:u.outputTokens,total_tokens:u.totalTokens}:'unknown',compatibility:{replayed:result.replayed,receipt:result.receipt,generated:result.generated}};
  }
}
export class PortBackedApiRehearsal extends BudgetedNightvoyage {
  constructor(directory,options={}){
    if(options.mode!=='stub'||options.allowance?.mode!=='stub'||(options.protocol!==undefined&&!['grounded-wake-v2','inline-evidence-v1'].includes(options.protocol)))fail('legacy_api_rehearsal_only');
    super(directory,options);
  }
  createBudgetClient(options){
    const client=new GatedDeepSeekClient(this.store,options),adapter=new LegacyDeepSeekAdapter(client);
    this.modelAdapter=adapter;
    return {protocol:client.protocol,protocolVersion:client.protocolVersion,ledger:client.ledger,mode:client.mode,
      close:()=>client.close(),send:async ({payload,requestId,runId,signal,...accounting})=>{
        const result=await adapter.generate({contract_version:dreamModelPortVersion,stage_schema:client.protocol==='inline-evidence-v1'?'inline-evidence-v1':'legacy-grounded-wake-v2',request_id:requestId,run_id:runId,...payload},{signal,accounting});
        return result.compatibility;
      }};
  }
  // Owner differs from old API runs; cannot adopt/rewrite a historical allowance run.
  executionFamily(){return 'dream-model-port-legacy-api-rehearsal-v1';}
  status(id){
    this.assertExecutionOwner(this.run(id));const r=super.status(id),rows=r.billing??[];
    return {...r,...this.modelAdapter.identity,contract_version:dreamModelPortVersion,fallback_from:null,fallback_reason:null,
      external_calls_started:0,stage_dispatches_started:rows.length,
      checkpoint:{saved_scenes:r.stagesSaved,wake_saved:r.status==='completed'},
      usage:rows.map(row=>({request_id:row.requestId,usage:row.usage?{input_tokens:row.usage.inputTokens,output_tokens:row.usage.outputTokens,total_tokens:row.usage.totalTokens}:'unknown'}))};
  }
}

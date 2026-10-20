// Development fixture runtime. Native executable, when supplied, still talks only to loopback.
import {CodexAdapter,selectAdapter} from './codex-local-model-port.mjs';
import {ModelPortNightvoyage} from './codex-local-model-runtime.mjs';
import {createAccountedCodexStageTransport} from './codex-accounted-stage-transport.mjs';
import {createCodexDreamHttpAccount,checkCodexDreamHttp,codexDreamHttpVersion} from './codex-dream-http-account.mjs';
export class AccountedCodexDream extends ModelPortNightvoyage {
 constructor(directory,options={}){
  if(!options||Object.getPrototypeOf(options)!==Object.prototype||Reflect.ownKeys(options).some(k=>!['executable','scenario','timeoutMs','fault'].includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(options,k),'value')))throw Error('accounted_runtime_options_invalid');
  const {fault=()=>{},...transportOptions}=options;if(typeof fault!=='function')throw Error('accounted_runtime_options_invalid');
  const transport=createAccountedCodexStageTransport(transportOptions),selection=selectAdapter({primary:new CodexAdapter({model_id:'gpt-5.6-sol',stageTransport:transport})});
  super(directory,{selection,fault});this.transport=transport;
 }
 assertExecutionOwner(r){super.assertExecutionOwner(r);checkCodexDreamHttp(r);}
 status(id){
  const r=this.run(id),receipt=super.status(id);
  return {...receipt,local_http_accounting:{version:codexDreamHttpVersion,calls:checkCodexDreamHttp(r),maxCalls:3,maxCallsPerStage:1,
   stages:r.attempts.map(a=>({request_id:a.request_id,stage:a.stage,index:a.index,checkpoint_committed:a.state==='committed',requests:structuredClone(a.codex_fixture_http?.requests??[])})),
   realModelRequests:0,realProviderAccountingIntegrated:false,powerLossDurabilityVerified:false,remoteCancellationConfirmed:'unknown',productionAdmission:false}};
 }
 async stage(r,stage,signal){
  this.assertExecutionOwner(r);if(checkCodexDreamHttp(r)>=3)throw Error('budget_exhausted');
  const account=createCodexDreamHttpAccount(this.store,r,stage);this.transport.bindAccount(account);
  try{return await super.stage(r,stage,signal);}catch(error){if(this.store.poisoned)throw Error('storage_io_failure');throw error;}finally{await this.transport.releaseAccount(account);}
 }
 close(){if(this.transport?.status().inFlight)throw Error('active_runs');this.transport?.close();super.close();}
}

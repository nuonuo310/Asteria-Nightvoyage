// Only fixed local fixture exchanges, with an issued same-Store stage account.
import fs from 'node:fs';
import path from 'node:path';
import {isCodexDreamHttpAccount} from './codex-dream-http-account.mjs';
import {runCodexAccountedFixtureStage} from './codex-accounted-stage-owner.mjs';
const issued=new WeakSet();
export const isAccountedCodexStageTransport=value=>issued.has(value);
function fields(value,keys){if(!value||Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).some(k=>!keys.includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,k),'value')))throw Error('accounted_transport_options_invalid');}
export function createAccountedCodexStageTransport(options={}){
 fields(options,['executable','scenario','timeoutMs']);const {executable,scenario='stage_success',timeoutMs=15000}=options;
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000||!['stage_success','stage_wrong_text','stage_failed','stage_tool','stage_exit','stage_stall','second_stage_exit'].includes(scenario))throw Error('accounted_transport_options_invalid');
 let binary;
 if(executable!==undefined){
  if(Object.hasOwn(options,'scenario')||typeof executable!=='string'||!path.isAbsolute(executable)||!/^codex(?:\.exe)?$/i.test(path.basename(executable)))throw Error('metadata_executable_invalid');
  binary=fs.realpathSync(executable);if(!fs.statSync(binary).isFile()||!/^codex(?:\.exe)?$/i.test(path.basename(binary)))throw Error('metadata_executable_invalid');
 }
 const kind=binary?'native':'independent_node_peer';let account=null,active=null,closed=false,started=0,settled=0;const reports=[];
 const transport=Object.freeze({model_id:'gpt-5.6-sol',protocolVersion:binary?'codex-native-accounted-stage-v1':'codex-peer-accounted-stage-v1',ready:()=>!closed,
  status:()=>({kind,closed,inFlight:!!active,exchangesStarted:started,exchangesSettled:settled,maxStageExchanges:3,externalCallsStarted:0,realModelRequests:0,credentialReads:0,reports:structuredClone(reports)}),
  bindAccount(value){if(closed||active||account||!isCodexDreamHttpAccount(value))throw Error('dream_stage_account_required');account=value;},
  async releaseAccount(value){if(account!==value)throw Error('dream_stage_account_required');if(active){active.controller.abort();try{await active.done;}catch{}}value.close();account=null;},
  async exchange(draft,options={}){
   fields(options,['signal']);const {signal}=options;if(signal!==undefined&&!(signal instanceof AbortSignal))throw Error('accounted_transport_options_invalid');
   if(closed||active)throw Error('adapter_unavailable');if(!account)throw Error('dream_stage_account_required');if(started>=3)throw Error('budget_exhausted');if(signal?.aborted)throw Error('cancelled');
   const current=account;current.activate();const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
   const token={controller,done:null};active=token;started++;
   const launch=binary?{kind,binary}:{kind,scenario:scenario==='second_stage_exit'?(started===2?'stage_exit':'stage_success'):scenario};
   token.done=(async()=>{try{
    const result=await runCodexAccountedFixtureStage(launch,draft,{signal:controller.signal,timeoutMs,dreamStage:current});reports.push(result.report);
    if(closed||signal?.aborted||controller.signal.aborted||result.report.status==='cancelled')throw Error('cancelled');
    if(result.report.status!=='fixed_stage_completion_observed'||!result.reply)throw Error(result.report.reason==='preparation_timeout'?'timeout':'invalid_model_response');
    return result.reply;
   }finally{signal?.removeEventListener('abort',abort);settled++;if(active===token)active=null;}})();return token.done;
  },
  async close(){closed=true;if(active){active.controller.abort();try{await active.done;}catch{}}account?.close();account=null;}
 });issued.add(transport);return transport;
}

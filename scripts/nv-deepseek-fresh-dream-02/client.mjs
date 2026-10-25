// Fixed-contract client. Offline uses one branded loopback peer; live uses only the pinned endpoint.
import https from 'node:https';
import {GatedDeepSeekClient} from '../../src/gated-deepseek-client.js';
import {copy, fail} from '../../src/store.js';
import {buildInlineRequest} from '../../src/inline-evidence-protocol.js';
import {readOneDreamAuthorization, assertOneDreamStage} from './authorization.mjs';
import {OneDreamLedger} from './ledger.mjs';
import {oneDreamLoopbackKind} from './policy.mjs';

function providerResponse(endpoint,request){
  return new Promise((resolve,reject)=>{
    let done=false,client;
    const stop=()=>{if(done)return;done=true;try{client?.destroy();}catch{}reject(Error('one_dream_provider_transport_failed'));};
    try{
      client=https.request(endpoint,{method:'POST',headers:request.headers,signal:request.signal,agent:false},response=>{
        response.on('error',stop);
        if(response.statusCode!==200){if(!done){try{const result=new Response(null,{status:response.statusCode});done=true;try{response.destroy();}catch{}resolve(result);}catch{stop();}}return;}
        const chunks=[];let bytes=0;
        response.on('data',chunk=>{if(done)return;bytes+=chunk.length;if(bytes>65536){try{response.destroy();}catch{}stop();}else chunks.push(Buffer.from(chunk));});
        response.on('aborted',stop);response.on('end',()=>{if(done)return;done=true;resolve(new Response(Buffer.concat(chunks),{status:200}));});
      });
      client.on('error',stop);client.end(request.body);
    }catch{stop();}
  });
}
export class OneDreamClient extends GatedDeepSeekClient{
  #issued=new Set();
  constructor(store,{loopback,...options}={}){
    super(store,{...options,protocol:'inline-evidence-v1'});
    this.ledger=new OneDreamLedger(store);
    this.loopback=loopback;
  }
  static assertInlineLiveConstruction(store){readOneDreamAuthorization(store,{mode:'live'});}
  assertInlineLiveSend(){const record=readOneDreamAuthorization(this.store,{mode:'live'});if(this.mode!=='live'||record.mode!=='live')fail('one_dream_runtime_mode_mismatch');}
  checkAdmission(context,phase){try{assertOneDreamStage(this.store,context,phase,{mode:this.mode});}catch(error){if(!['one_dream_source_withdrawn','one_dream_contract_expired','one_dream_authorization_revoked','one_dream_ambiguous_attempt'].includes(error.message))this.store.poisoned=true;throw error;}}
  send(args){if(typeof args?.publish!=='function')fail('one_dream_managed_publication_required');return super.send({...args,payload:copy(args.payload)});}
  checkProviderBody(body,credential){
    const scan=value=>{if(typeof value==='string'&&value.includes(credential))fail('one_dream_provider_secret_echo');if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){scan(key);scan(child);}};
    scan(body);const content=body?.choices?.[0]?.message?.content;if(typeof content==='string'){let data;try{data=JSON.parse(content);}catch{}scan(data);}
  }
  dispatchTransport(endpoint,request,context){
    const record=assertOneDreamStage(this.store,context,'before_http',{mode:this.mode}),key=context.requestId,expected=buildInlineRequest(context.payload,{model:record.terms.allowance.pricing.model,maxOutputTokens:400});
    if(this.#issued.has(key)||endpoint!==record.terms.contract.provider.endpoint||request.body!==JSON.stringify(expected.body)||request.method!=='POST'||request.redirect!=='error')fail('one_dream_transport_contract_mismatch');
    this.#issued.add(key);
    if(this.mode==='stub'){
      if(this.loopback?.kind!==oneDreamLoopbackKind||this.loopback.host!=='127.0.0.1'||typeof this.loopback.transport!=='function')fail('one_dream_loopback_required');
      return this.loopback.transport(endpoint,request);
    }
    return providerResponse(endpoint,request);
  }
}

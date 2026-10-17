// Deliberately fixed fictional simulator, not a model, quality sample or real HTTP.
import {InlineAuthorizedStubRuntime} from './inline-authorized-runtime.js';
import {readInlineAuthorization} from './inline-entry-authorization.js';
const events=['梦里的人把绿色钥匙放在窗台，望着玻璃里的风筝。','梦里的人向后退了半步，钥匙仍在窗台，玻璃映着安静的墙。'];
export async function runInlineStubSession(command,directory){
  if(!['run','resume'].includes(command))throw Error('invalid_stub_bootstrap_arguments');
  let calls=0,id,engine;
  const transport=async(_url,request)=>{
    calls++;
    const material=JSON.parse(JSON.parse(request.body).messages[1].content);
    const value=material.stage==='wake'?{fragment:material.previousScenes[0].event,residue:0.1,associations:[]}:{event:events[material.sceneIndex],appraisal:{goalEffect:0,control:0.5,uncertainty:0.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}};
    return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(value)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));
  };
  const cancel=()=>{if(id)engine.cancel(id);};
  try{
    engine=new InlineAuthorizedStubRuntime(directory,{enabled:true,fetchImpl:transport});
    process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
    const authorization=readInlineAuthorization(engine.store);
    const saved=engine.store.state.requests[authorization.terms.requestId];
    if(command==='resume'){
      if(!saved)throw Error('explicit_resume_requires_existing_run');id=saved.runId;await engine.resume(id,{retryUnknown:true});
    }else{id=engine.start();await engine.execute(id);}
    const packet=engine.result(id);
    return {status:packet.receipt.status,stagesSaved:packet.receipt.stagesSaved,stubCalls:calls,settledRows:packet.receipt.billing.filter(r=>r.status==='settled').length,syntheticHeldOrSpentMicroCny:packet.receipt.budget.heldOrSpentMicroCny,materialKind:'fictional',generatedEventOrigin:'dream',isRealityFact:false,persistsGeneratedBody:packet.dream!==null,paidAuthorization:false};
  }finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);engine?.close();}
}

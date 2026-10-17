// In-process HTTPS stand-in, never a provider connection or caller runtime option.
import https from 'node:https';
import {EventEmitter} from 'node:events';
export function mockPaidHttps(t,handle){
  const original=https.request,calls=[];
  https.request=(endpoint,options,receive)=>{
    const req=new EventEmitter();req.destroy=()=>{};
    req.end=body=>{
      calls.push({endpoint,options,body});
      const response=new EventEmitter();response.statusCode=200;response.destroy=()=>{};
      const respond=(data,status=200)=>{response.statusCode=status;receive(response);if(status===200){response.emit('data',Buffer.from(typeof data==='string'?data:JSON.stringify(data)));response.emit('end');}};
      Promise.resolve().then(()=>handle({endpoint,options,body,req,response,respond,receive,calls})).catch(error=>req.emit('error',error));
    };return req;
  };
  t.after(()=>https.request=original);return calls;
}
export function paidFixtureBody(body){
  const m=JSON.parse(JSON.parse(body).messages[1].content);
  const data=m.stage==='wake'?{fragment:m.previousScenes[0].event,residue:.1,associations:[]}:{event:m.sceneIndex===0?'梦里的人把绿色钥匙放在窗台，玻璃映着一只风筝。':'梦里的人退后半步，窗台上的钥匙没有移动，风筝的影子淡了。',appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}};
  return {model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}};
}

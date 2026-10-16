// Existing independent public scripted scenes; not candidate-generated quality examples.
import fs from 'node:fs';
const contrasts=JSON.parse(fs.readFileSync(new URL('../fixtures/affect-support-contrasts.json',import.meta.url),'utf8'));
export const continuitySeed=()=>JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url),'utf8'));
export function continuityResponse(request){
  const material=JSON.parse(request.body.messages[1].content),data=material.stage==='wake'?{fragment:material.previousScenes[0].event,residue:.1,associations:[]}:structuredClone(contrasts.scenes.find(s=>s.id===(material.sceneIndex===0?'explicit-unchanged':'explicit-relief')).raw);
  return {status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}};
}

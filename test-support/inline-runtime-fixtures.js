// Existing independently authored public contrasts, not candidate-generated quality evidence.
import fs from 'node:fs';
export {continuitySeed as inlineSeed} from './continuity-runtime-fixtures.js';
const contrasts=JSON.parse(fs.readFileSync(new URL('../fixtures/affect-support-contrasts.json',import.meta.url),'utf8'));
export function inlineResponse(request){
  const m=JSON.parse(request.body.messages[1].content);let data;
  if(m.stage==='wake')data={fragment:m.previousScenes[0].event,residue:.1,associations:[]};
  else{const raw=structuredClone(contrasts.scenes.find(s=>s.id===(m.sceneIndex===0?'explicit-unchanged':'explicit-relief')).raw);data={event:raw.event,appraisal:raw.appraisal,basis:{goal:null,control:null,uncertainty:null},affect:raw.affect.kind==='unchanged'?{kind:'unchanged'}:{kind:'estimated',delta:raw.affect.delta,excerpt:raw.evidence[raw.affect.evidence]}};}
  return {status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}};
}

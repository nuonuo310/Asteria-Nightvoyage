// Independent Node fixture, NOT Codex. Only speaks scripted fictional NDJSON.
import readline from 'node:readline';
import {codexTranscript} from './model-port-protocol-fixtures.js';
if(['NODE_OPTIONS','NODE_PATH','OPENAI_API_KEY','NIGHTVOYAGE_DEEPSEEK_KEY','ACCESS_TOKEN','HTTP_PROXY','HTTPS_PROXY'].some(k=>process.env[k]!==undefined))process.exit(27);
const scenario=process.argv[2];
if(!['success','exit_after_initialize','exit_after_turn','stall','stderr','trailing','invalid'].includes(scenario))process.exit(2);
const rl=readline.createInterface({input:process.stdin,crlfDelay:Infinity});let phase=0;
rl.on('close',()=>{if(scenario==='stall')process.exit(28);});
const send=v=>process.stdout.write(JSON.stringify(v)+'\n');
rl.on('line',line=>{
 try{
  const frame=JSON.parse(line);
  if(phase===0&&frame.method==='initialize'&&frame.id===1){
   if(scenario==='exit_after_initialize')process.exit(23);
   send({id:1,result:{userAgent:'independent-node-fixture'}});phase=1;return;
  }
  if(phase===1&&frame.method==='initialized'){phase=2;return;}
  if(phase===2&&frame.method==='thread/start'&&frame.id===2){
   send({id:2,result:{thread:{id:'fiction-pipe-thread'},model:frame.params.model}});
   send({method:'thread/started',params:{thread:{id:'fiction-pipe-thread'}}});phase=3;return;
  }
  if(phase===3&&frame.method==='turn/start'&&frame.id===3){
   phase=4;if(scenario==='exit_after_turn')process.exit(24);
   if(scenario==='stall'){setInterval(()=>{},1000);return;}
   if(scenario==='stderr'){process.stderr.write('FICTIONAL_PRIVATE_STDERR_SENTINEL');return;}
   if(scenario==='invalid'){process.stdout.write('not-json\n');return;}
   send({id:3,result:{turn:{id:'fiction-pipe-turn',status:'inProgress',items:[],error:null}}});
   const text=frame.params.input[0].text,offset=text.lastIndexOf('\n{');if(offset<0)throw Error('fixture_input');
   const transcript=codexTranscript({input:text.slice(offset+1)},undefined,{thread:'fiction-pipe-thread',turn:'fiction-pipe-turn'});
   for(const bytes of transcript.chunks)process.stdout.write(bytes);
   if(scenario==='trailing')send({method:'unexpected',params:{}});
   rl.close();process.stdin.destroy();process.stdout.end();return;
  }
  process.exit(25);
 }catch{process.exit(26);}
});

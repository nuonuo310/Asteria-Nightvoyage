// Explicit local review only. This script is outside the paid source inventory.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store,fail} from '../src/store.js';
import {safeId} from '../src/contract.js';
import {assertAppraisalReviewJsonData} from '../src/appraisal-review-memory.js';
import {LocalFileAppraisalReviewAdapter} from '../src/appraisal-review-adapter.js';

export const reviewInputByteLimit=16384;
const exact=(value,names)=>{
  if(!value||Array.isArray(value)||Object.keys(value).length!==names.length||names.some(k=>!Object.hasOwn(value,k)))fail('invalid_local_review_input');
};
export function parseReviewCommand(args){
  const [action='help',...rest]=args,flags=new Map();
  if(!['help','create','read','list'].includes(action))fail('invalid_local_review_arguments');
  while(rest.length){
    const key=rest.shift(),value=rest.shift();
    if(!['--data-dir','--review-id','--dream-id'].includes(key)||flags.has(key)||!value||value.startsWith('--'))fail('invalid_local_review_arguments');
    flags.set(key,value);
  }
  const expected=action==='help'?[]:action==='create'?['--data-dir']:action==='read'?['--data-dir','--review-id']:['--data-dir','--dream-id'];
  if(flags.size!==expected.length||expected.some(k=>!flags.has(k)))fail('invalid_local_review_arguments');
  if(action!=='help'&&!path.isAbsolute(flags.get('--data-dir')))fail('absolute_review_store_required');
  for(const key of ['--review-id','--dream-id'])if(flags.has(key)&&!safeId(flags.get(key)))fail('invalid_local_review_arguments');
  return {action,directory:flags.get('--data-dir'),reviewId:flags.get('--review-id'),dreamId:flags.get('--dream-id')};
}
export function parseReviewInput(bytes){
  if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>reviewInputByteLimit)fail('invalid_local_review_input');
  let input;
  try{input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));assertAppraisalReviewJsonData(input);}catch{fail('invalid_local_review_input');}
  exact(input,['schemaVersion','dreamId','reviewer','request']);
  exact(input.reviewer,['actorId','kind']);
  exact(input.request,['id','requestId','sceneIndex','assessment','supersedesReviewId']);
  if(input.schemaVersion!==1||!safeId(input.dreamId)||!safeId(input.reviewer.actorId)||!['person','assistant'].includes(input.reviewer.kind))fail('invalid_local_review_input');
  for(const key of ['id','requestId'])if(!safeId(input.request[key]))fail('invalid_local_review_input');
  return input;
}
async function stdinBytes(){
  if(process.stdin.isTTY)fail('local_review_stdin_required');
  const chunks=[];let size=0;
  const timer=setTimeout(()=>process.stdin.destroy(new Error('local_review_input_timeout')),5000);
  try{
    for await(const chunk of process.stdin){
      size+=chunk.length;
      if(size>reviewInputByteLimit){process.stdin.destroy();fail('invalid_local_review_input');}
      chunks.push(chunk);
    }
    return Buffer.concat(chunks,size);
  }finally{clearTimeout(timer);}
}
const help='Local independent appraisal reviews (no model/key/approval):\ncreate --data-dir <absolute existing external Store> < UTF-8 JSON on stdin\nread --data-dir <absolute existing external Store> --review-id <id>\nlist --data-dir <absolute existing external Store> --dream-id <id>\nCreate input: {schemaVersion:1,dreamId,reviewer:{actorId,kind:person|assistant},request:{id,requestId,sceneIndex,assessment,supersedesReviewId}}. Reviewer identity is a local assertion, not verified human consent. Originals are never overwritten. No automatic review, generation or Asteria write.';

export async function runLocalReviewCommand(args){
  const command=parseReviewCommand(args);
  if(command.action==='help')return help;
  // Validate bounded input before acquiring a Store owner or doing recovery writes.
  const input=command.action==='create'?parseReviewInput(await stdinBytes()):null;
  if(!fs.existsSync(path.join(command.directory,'state.json')))fail('existing_review_store_required');
  const store=new Store(command.directory);
  try{
    const adapter=new LocalFileAppraisalReviewAdapter(store,input?.reviewer??{actorId:'local-review-reader',kind:'assistant'});
    if(command.action==='read')return adapter.readReview({reviewId:command.reviewId});
    if(command.action==='list')return adapter.listReviews({dreamId:command.dreamId});
    const review=adapter.createReview({dreamId:input.dreamId,request:input.request}).review;
    // Body-free receipt: only an explicit read/list displays saved assessment text.
    return {schemaVersion:1,action:'create',status:review?'available':'unavailable',contractVersion:adapter.capabilities().contractVersion,
      review:review?{id:review.id,origin:review.origin,materialKind:review.materialKind,isRealityFact:false,sourceRefs:review.sourceRefs,parent:review.parent,reviewer:review.reviewer}:null};
  }finally{store.close();}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const result=await runLocalReviewCommand(process.argv.slice(2));
    console.log(typeof result==='string'?result:JSON.stringify(result,null,2));
  }catch(error){
    const known=['invalid_local_review_arguments','absolute_review_store_required','invalid_local_review_input','local_review_stdin_required','local_review_input_timeout','existing_review_store_required','data_inside_checkout','symlink_data','store_busy','store_unavailable','storage_io_failure','review_parent_unavailable','review_request_conflict','review_id_conflict','review_revision_conflict','review_capacity_reached','invalid_appraisal_review_draft','unsupported_review_parent'];
    console.error(`Nightvoyage local review stopped: ${known.includes(error?.message)?error.message:'local_review_check_failed'}.`);
    process.exitCode=1;
  }
}

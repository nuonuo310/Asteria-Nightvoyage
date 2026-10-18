// Local reader only. Kept outside paid source inventory; no generation or review writes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store,copy,fail} from '../src/store.js';
import {own,safeId} from '../src/contract.js';
import {assertAppraisalReviewJsonData} from '../src/appraisal-review-memory.js';
import {readContentReview} from '../src/content-review.js';
import {readModelPortContent} from './missing-type-content-view.mjs';
import {renderDreambookReview} from './dreambook-review-text.mjs';
export const dreambookReaderVersion='local-dreambook-reader-v1';
const supported=new Set(['coupled-affect-quotes-v1','scene-continuity-quotes-v1','inline-evidence-quotes-v1']);
function parse(args){
  const [action='help',...rest]=args,flags=new Map();
  if(!['help','list','read'].includes(action))fail('invalid_dreambook_arguments');
  while(rest.length){
    const key=rest.shift();
    if(!['--data-dir','--dream-id','--latest','--review-json'].includes(key)||flags.has(key))fail('invalid_dreambook_arguments');
    const value=['--latest','--review-json'].includes(key)?true:rest.shift();
    if(!value||typeof value==='string'&&value.startsWith('--'))fail('invalid_dreambook_arguments');flags.set(key,value);
  }
  if(action==='help'&&flags.size||action==='list'&&(flags.has('--dream-id')||flags.has('--latest')||flags.has('--review-json'))||action==='read'&&(Number(flags.has('--dream-id'))+Number(flags.has('--latest'))!==1))fail('invalid_dreambook_arguments');
  if(flags.has('--dream-id')&&!safeId(flags.get('--dream-id')))fail('invalid_dreambook_arguments');
  if(flags.has('--data-dir')&&!path.isAbsolute(flags.get('--data-dir')))fail('absolute_dreambook_store_required');
  return {action,flags};
}
export function dreambookCatalog(store){
  store.assert();
  const dreams=[];
  for(const [id,entry]of Object.entries(store.state.entries)){
    if(entry.origin!=='dream')continue;
    assertAppraisalReviewJsonData(entry);
    const run=own(store.state.runs,entry.runId);
    if(!safeId(id)||entry.id!==id||!safeId(entry.runId)||entry.materialKind!=='fictional'||entry.isRealityFact!==false||!run||run.id!==entry.runId||run.status!=='completed'||run.entryId!==id||!Array.isArray(entry.sourceRefs)||!entry.sourceRefs.length||!Array.isArray(entry.scenes)||entry.scenes.length<1||entry.scenes.length>2)fail('invalid_dreambook_entry');
    for(const ref of entry.sourceRefs)if(!ref||Object.keys(ref).length!==2||!Object.hasOwn(ref,'id')||!Object.hasOwn(ref,'version')||typeof ref.id!=='string'||!ref.id||ref.id.length>200||typeof ref.version!=='string'||!ref.version||ref.version.length>20000)fail('invalid_dreambook_entry');
    if(entry.sourceRefs.some(s=>store.withdrawn.includes(s.id))||store.deletions.some(d=>d.entryId===id||d.wholeRun&&d.runId===entry.runId))continue;
    dreams.push({id,origin:'dream',materialKind:entry.materialKind,isRealityFact:false,sourceRefs:copy(entry.sourceRefs),sceneCount:entry.scenes.length,cherished:entry.cherished,recallAccess:entry.recallAccess,protocolVersion:run.modelPortVersion??run.appraisalProtocolVersion??null,protocolSupported:run.modelPortVersion==='dream-model-port-v1'||supported.has(run.appraisalProtocolVersion)});
  }
  return {schemaVersion:1,readerVersion:dreambookReaderVersion,origin:'dreambook_catalog',isRealityFact:false,ordering:'persisted_visible_dream_insertion_order_not_creation_time',dreams};
}
export function runDreambook(args){
  const {action,flags}=parse(args);
  if(action==='help')return 'Nightvoyage local dreambook: list [--data-dir <absolute existing Store>] | read (--latest | --dream-id <id>) [--data-dir <absolute existing Store>] [--review-json]. Default read shows Chinese review labels; --review-json displays complete saved review records. Help opens no Store. List is metadata only; read displays private saved content locally. No model, key, generation, review write, deletion or export. Latest means last visible dream in persisted insertion order, not a timestamp.';
  const directory=flags.get('--data-dir')??path.join(process.env.LOCALAPPDATA??path.join(os.homedir(),'.local','share'),'Nightvoyage','first-fictional-trial');
  if(!path.isAbsolute(directory))fail('absolute_dreambook_store_required');
  if(!fs.existsSync(path.join(directory,'state.json')))fail('existing_dreambook_store_required');
  const store=new Store(directory);
  try{
    const catalog=dreambookCatalog(store);
    if(action==='list')return JSON.stringify(catalog,null,2);
    const id=flags.has('--latest')?catalog.dreams.at(-1)?.id:flags.get('--dream-id');
    if(!id||!catalog.dreams.some(d=>d.id===id))return '当前没有可查看的已保存梦境。';
    // Unsupported/corrupt selected dreams fail closed; never silently substitute an older one.
    const run=store.state.runs[store.state.entries[id].runId];
    const view=run.modelPortVersion==='dream-model-port-v1'?readModelPortContent(store,id):readContentReview(store,id);
    return renderDreambookReview(view,{reviewJson:flags.has('--review-json')});
  }finally{store.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(runDreambook(process.argv.slice(2)));}
  catch(error){
    const known=['invalid_dreambook_arguments','absolute_dreambook_store_required','existing_dreambook_store_required','invalid_dreambook_entry','unsupported_review_parent','data_inside_checkout','symlink_data','store_busy','store_unavailable','storage_io_failure'];
    console.error(`Nightvoyage dreambook stopped: ${known.includes(error?.message)?error.message:'dreambook_read_failed'}.`);process.exitCode=1;
  }
}

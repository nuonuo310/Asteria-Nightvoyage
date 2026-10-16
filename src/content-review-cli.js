import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {Store,fail} from './store.js';
import {own,safeId} from './contract.js';
import {readContentReview,renderContentReview} from './content-review.js';
let store;
try {
  const args=process.argv.slice(2),action=args.shift()??'help',flags=new Map();
  while(args.length){const key=args.shift(),value=args.shift();if(!['--data-dir','--dream-id'].includes(key)||flags.has(key)||!value||value.startsWith('--'))fail('invalid_content_review_arguments');flags.set(key,value);}
  if(!['help','read'].includes(action)||(action==='help'&&flags.size))fail('invalid_content_review_arguments');
  if(action==='help')console.log('Local content review: read [--data-dir <existing external Store>] [--dream-id <coupled dream id>]. No key, generation, approval, export file or automatic review. Default reads the completed coupled trial in the existing local trial Store.');
  else {
    if(flags.has('--dream-id')&&!safeId(flags.get('--dream-id')))fail('invalid_content_review_arguments');
    const directory=flags.has('--data-dir')?path.resolve(flags.get('--data-dir')):path.join(process.env.LOCALAPPDATA??path.join(os.homedir(),'.local','share'),'Nightvoyage','first-fictional-trial');
    if(!fs.existsSync(path.join(directory,'state.json')))fail('existing_content_store_required');
    // Existing Store owns locking, startup journal recovery and atomic save; logical read,
    // not a claim of zero filesystem writes. No account/profile is initialized here.
    store=new Store(directory);
    const runId=own(store.state.requests,'coupled-affect-dream-trial-20261016')?.runId;
    const dreamId=flags.get('--dream-id')??(runId?own(store.state.runs,runId)?.entryId:null);
    console.log(dreamId?renderContentReview(readContentReview(store,dreamId)):'尚无可查看的已保存梦境。');
  }
} catch(error) {
  const codes=['invalid_content_review_arguments','existing_content_store_required','invalid_content_review_wake','managed_store_required','store_busy','store_unavailable','unsupported_review_parent'];
  console.error(`Nightvoyage content reader stopped: ${codes.includes(error.message)?error.message:'local_content_check_failed'}.`);process.exitCode=1;
} finally {store?.close();}

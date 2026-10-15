import path from 'node:path';
import os from 'node:os';
import { Store, fail } from './store.js';
import { singleSceneProposal, initSingleSceneDiagnostic, readSingleSceneConfig, singleSceneState, singleScenePreflight, executeSingleSceneDiagnostic } from './single-scene-diagnostic.js';

let store;
try {
  const args=process.argv.slice(2),action=args.shift()??'help',flags=new Map();
  const booleans=['--allow-fictional-egress','--acknowledge-preserved-hold','--live'];
  while(args.length){const k=args.shift();if(![...booleans,'--data-dir','--approve-budget-cny','--approve-case'].includes(k)||flags.has(k))fail('invalid_diagnostic_arguments');
    if(booleans.includes(k))flags.set(k,true);else{const v=args.shift();if(!v||v.startsWith('--'))fail('invalid_diagnostic_arguments');flags.set(k,v);}}
  const allowed={help:[],proposal:[],init:['--data-dir','--approve-budget-cny','--approve-case','--allow-fictional-egress','--acknowledge-preserved-hold'],preflight:['--data-dir'],read:['--data-dir'],run:['--data-dir','--live']};
  if(!Object.hasOwn(allowed,action)||[...flags.keys()].some(k=>!allowed[action].includes(k)))fail('invalid_diagnostic_arguments');
  const directory=flags.has('--data-dir')?path.resolve(flags.get('--data-dir')):path.join(process.env.LOCALAPPDATA??path.join(os.homedir(),'.local','share'),'Nightvoyage','first-fictional-trial');
  if(action==='proposal')console.log(JSON.stringify(singleSceneProposal(),null,2));
  else if(action==='init'){
    initSingleSceneDiagnostic(directory,{budgetCny:flags.get('--approve-budget-cny'),approvedCase:flags.get('--approve-case'),
      approveFictionalEgress:flags.has('--allow-fictional-egress'),approvePreservedHold:flags.has('--acknowledge-preserved-hold')});
    console.log(JSON.stringify(singleScenePreflight(directory),null,2));
  }else if(action==='preflight'||action==='read')console.log(JSON.stringify(singleScenePreflight(directory),null,2));
  else if(action==='run'){
    if(!flags.has('--live'))fail('explicit_live_flag_required');
    const config=readSingleSceneConfig(directory);store=new Store(directory);
    const check=singleSceneState(store,config);
    if(!check.ready){console.log(JSON.stringify(check,null,2));fail('diagnostic_preflight_blocked');}
    // Rechecked under the same owner lock before credentials are accessed.
    const credential=process.env.NIGHTVOYAGE_DEEPSEEK_KEY;
    const controller=new AbortController(),stop=()=>controller.abort();
    process.once('SIGINT',stop);process.once('SIGTERM',stop);
    try {const result=await executeSingleSceneDiagnostic(store,config,{credential,signal:controller.signal});
      console.log(JSON.stringify(result,null,2));if(result.protocolValidation!=='accepted')process.exitCode=1;
    }finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
  }else console.log('Single-scene diagnostic: proposal | preflight | read | run --live. init needs a new CNY 3 / sparse-context / fictional-egress approval and --acknowledge-preserved-hold. One call only; no generated body, second scene, wake, resume or reset. Default data is the SAME external trial Store.');
}catch(error){
  const permitted=['invalid_diagnostic_arguments','diagnostic_source_changed','compact_protocol_source_changed','diagnostic_approval_missing_or_unsafe','diagnostic_config_not_reviewed',
    'explicit_diagnostic_approval_required','pricing_review_expired','source_withdrawn','expected_prior_compact_failure_required','other_unsettled_attempt_requires_review',
    'diagnostic_run_identity_mismatch','diagnostic_preflight_blocked','credential_required','explicit_live_flag_required','storage_io_failure'];
  console.error(`Nightvoyage single-scene diagnostic stopped: ${permitted.includes(error.message)?error.message:'local_check_or_runtime_failed'}. No raw provider error or credential is printed.`);process.exitCode=1;
}finally{store?.close();}

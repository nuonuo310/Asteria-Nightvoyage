import path from 'node:path';
import os from 'node:os';
import { fail } from './store.js';
import { Nightvoyage } from './engine.js';
import { BudgetedNightvoyage } from './budgeted-runtime.js';
import { readAppraisalView } from './appraisal-view.js';
import { compactTrialId, compactTrialProposal, initCompactTrial, readCompactTrial, compactTrialInput, compactTrialPreflight, compactTrialState } from './compact-trial-config.js';

const result=e=>{const id=e.store.state.requests[compactTrialId]?.runId;if(!id)return {status:'not_started',qualityAssessed:false};const packet=e.result(id);return {...packet,appraisalView:packet.dream?readAppraisalView(e.store,packet.dream.id):null};};
let engine;
try {
  const args=process.argv.slice(2),action=args.shift()??'help',flags=new Map();
  while(args.length){const key=args.shift();if(!['--data-dir','--approve-budget-cny','--approve-case','--allow-fictional-egress','--live','--resume'].includes(key)||flags.has(key))fail('invalid_compact_arguments');
    if(['--allow-fictional-egress','--live','--resume'].includes(key))flags.set(key,true);else{const value=args.shift();if(!value||value.startsWith('--'))fail('invalid_compact_arguments');flags.set(key,value);}}
  const allowed={help:[],proposal:[],preflight:['--data-dir'],init:['--data-dir','--approve-budget-cny','--approve-case','--allow-fictional-egress'],run:['--data-dir','--live','--resume'],read:['--data-dir']};
  if(!Object.hasOwn(allowed,action)||[...flags.keys()].some(k=>!allowed[action].includes(k)))fail('invalid_compact_arguments');
  const directory=flags.has('--data-dir')?path.resolve(flags.get('--data-dir')):path.join(process.env.LOCALAPPDATA??path.join(os.homedir(),'.local','share'),'Nightvoyage','first-fictional-trial');
  if(action==='proposal')console.log(JSON.stringify(compactTrialProposal(),null,2));
  else if(action==='init'){
    initCompactTrial(directory,{budgetCny:flags.get('--approve-budget-cny'),approvedCase:flags.get('--approve-case'),approveFictionalEgress:flags.has('--allow-fictional-egress')});
    console.log(JSON.stringify(compactTrialPreflight(directory),null,2));
  }else if(action==='preflight')console.log(JSON.stringify(compactTrialPreflight(directory),null,2));
  else if(action==='run'||action==='read'){
    if(action==='run'&&!flags.has('--live'))fail('explicit_live_flag_required');
    const check=compactTrialPreflight(directory);if(check.reason==='compact_approval_required'){console.log(JSON.stringify(check,null,2));fail('compact_approval_required');}
    const config=readCompactTrial(directory),reader=new Nightvoyage(directory);let replay=false;
    try {
      const state=compactTrialState(reader.store,config);replay=action==='read'||state.run?.status==='completed';
      if(replay)console.log(JSON.stringify(result(reader),null,2));
      else {if(!state.ready){console.log(JSON.stringify(state,null,2));fail('compact_preflight_blocked');}
        if(state.run&&state.run.status!=='queued'&&!flags.has('--resume'))fail('explicit_resume_required');}
    } finally {reader.close();}
    if(!replay){
      engine=new BudgetedNightvoyage(directory,{allowance:config.allowance,mode:'live',protocol:'compact-appraisal-v1'});
      if(!compactTrialState(engine.store,config).ready)fail('compact_preflight_blocked');
      const input=compactTrialInput(config),credential=process.env.NIGHTVOYAGE_DEEPSEEK_KEY;if(!credential)fail('credential_required');
      engine.credential=credential;engine.client.enabled=true;const id=engine.start(compactTrialId,compactTrialId,input),stop=()=>engine.cancel(id);
      process.once('SIGINT',stop);process.once('SIGTERM',stop);
      try {
        if(flags.has('--resume')&&['failed','uncertain'].includes(engine.status(id).status))await engine.resume(id,{retryUnknown:true});else await engine.execute(id);
        console.log(JSON.stringify(result(engine),null,2));if(engine.status(id).status!=='completed')process.exitCode=1;
      }finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
    }
  }else console.log('Compact appraisal trial: proposal | preflight | read | run --live [--resume] [--data-dir <same-external-store>]. init needs separate approval: --approve-budget-cny 3 --approve-case sparse-context --allow-fictional-egress. One new fictional run / three calls; prior accounting retained; no action sends by default.');
}catch(error){
  const codes=['invalid_compact_arguments','compact_approval_required','compact_approval_missing_or_unsafe','compact_config_not_reviewed','compact_protocol_source_changed','prior_quality_screen_not_complete','explicit_compact_approval_required','pricing_review_expired','source_withdrawn','compact_run_identity_mismatch','compact_preflight_blocked','explicit_live_flag_required','explicit_resume_required','credential_required'];
  console.error(`Nightvoyage compact trial stopped: ${codes.includes(error.message)?error.message:'local_check_or_runtime_failed'}. No raw provider error or key is printed.`);process.exitCode=1;
}finally{engine?.close();}

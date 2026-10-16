import path from 'node:path';
import os from 'node:os';
import { fail } from './store.js';
import fs from 'node:fs';
import {readContentReview,renderContentReview} from './content-review.js';
import { Nightvoyage } from './engine.js';
import { BudgetedNightvoyage } from './budgeted-runtime.js';
import { readAppraisalView } from './appraisal-view.js';
import { continuityTrialId, continuityTrialProposal, initContinuityTrial, readContinuityTrial, continuityTrialInput, continuityTrialPreflight, continuityTrialState } from './continuity-trial-config.js';
const result=e=>{const id=e.store.state.requests[continuityTrialId]?.runId;if(!id)return {status:'not_started',qualityAssessed:false};const packet=e.result(id);return {...packet,appraisalView:packet.dream?readAppraisalView(e.store,packet.dream.id):null};};
let engine;
try{
  const args=process.argv.slice(2),action=args.shift()??'help',flags=new Map();
  while(args.length){const key=args.shift();if(!['--data-dir','--approve-budget-cny','--approve-case','--allow-fictional-egress','--acknowledge-preserved-holds','--live','--resume'].includes(key)||flags.has(key))fail('invalid_continuity_arguments');
    if(['--allow-fictional-egress','--acknowledge-preserved-holds','--live','--resume'].includes(key))flags.set(key,true);else{const value=args.shift();if(!value||value.startsWith('--'))fail('invalid_continuity_arguments');flags.set(key,value);}}
  const allowed={help:[],proposal:[],preflight:['--data-dir'],init:['--data-dir','--approve-budget-cny','--approve-case','--allow-fictional-egress','--acknowledge-preserved-holds'],run:['--data-dir','--live','--resume'],read:['--data-dir'],content:['--data-dir']};
  if(!Object.hasOwn(allowed,action)||[...flags.keys()].some(k=>!allowed[action].includes(k)))fail('invalid_continuity_arguments');
  const directory=flags.has('--data-dir')?path.resolve(flags.get('--data-dir')):path.join(process.env.LOCALAPPDATA??path.join(os.homedir(),'.local','share'),'Nightvoyage','first-fictional-trial');
  if(action==='proposal')console.log(JSON.stringify(continuityTrialProposal(),null,2));
  else if(action==='preflight')console.log(JSON.stringify(continuityTrialPreflight(directory),null,2));
  else if(action==='init'){
    initContinuityTrial(directory,{budgetCny:flags.get('--approve-budget-cny'),approvedCase:flags.get('--approve-case'),approveFictionalEgress:flags.has('--allow-fictional-egress'),acknowledgePreservedHolds:flags.has('--acknowledge-preserved-holds')});console.log(JSON.stringify(continuityTrialPreflight(directory),null,2));
  }else if(action==='run'||action==='read'||action==='content'){
    if(action==='run'&&!flags.has('--live'))fail('explicit_live_flag_required');
    const config=readContinuityTrial(directory);if(!fs.existsSync(path.join(directory,'state.json')))fail('completed_continuity_history_required');const reader=new Nightvoyage(directory);let replay=false;
    try{const state=continuityTrialState(reader.store,config);replay=action==='read'||action==='content'||state.run?.status==='completed';
      if(replay){if(action==='content'){const packet=result(reader);console.log(renderContentReview(packet.dream?readContentReview(reader.store,packet.dream.id):null));}else console.log(JSON.stringify(result(reader),null,2));}
      else{if(!state.ready){console.log(JSON.stringify(state,null,2));fail('continuity_preflight_blocked');}if(state.run&&state.run.status!=='queued'&&!flags.has('--resume'))fail('explicit_resume_required');}
    }finally{reader.close();}
    if(!replay){
      engine=new BudgetedNightvoyage(directory,{allowance:config.allowance,mode:'live',protocol:'scene-continuity-v1'});
      // Re-check under the runtime's owner lock. State validates the full saved chain
      // and builds the NEXT request for the byte guard before the Key property read.
      const state=continuityTrialState(engine.store,config);if(!state.ready)fail('continuity_preflight_blocked');
      if(state.run&&state.run.status!=='queued'&&!flags.has('--resume'))fail('explicit_resume_required');
      const input=continuityTrialInput(config),credential=process.env.NIGHTVOYAGE_DEEPSEEK_KEY;if(!credential)fail('credential_required');
      engine.credential=credential;engine.client.enabled=true;const id=engine.start(continuityTrialId,continuityTrialId,input),stop=()=>engine.cancel(id);
      process.once('SIGINT',stop);process.once('SIGTERM',stop);
      try{if(flags.has('--resume')&&engine.status(id).status==='uncertain')await engine.resume(id,{retryUnknown:true});else await engine.execute(id);
        console.log(JSON.stringify(result(engine),null,2));if(engine.status(id).status!=='completed')process.exitCode=1;
      }finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
    }
  }else console.log('Continuity trial: proposal | preflight | read | content | run --live [--resume] [--data-dir <same-external-store>]. init needs SEPARATE approval: --approve-budget-cny 3 --approve-case sparse-context --allow-fictional-egress --acknowledge-preserved-holds. One new dream / three calls; three old unknown holds unchanged. No default network, automatic retry or repair.');
}catch(error){
  const codes=['invalid_continuity_arguments','explicit_continuity_approval_required','continuity_approval_missing_or_unsafe','continuity_config_not_reviewed','continuity_protocol_source_changed','continuity_fixture_changed','continuity_run_identity_mismatch','continuity_preflight_blocked','completed_coupled_history_required','completed_continuity_history_required','continuity_live_entry_pending','other_unsettled_attempt_requires_review','pricing_review_expired','source_withdrawn','request_too_large','explicit_live_flag_required','explicit_resume_required','credential_required'];
  console.error(`Nightvoyage continuity trial stopped: ${codes.includes(error.message)?error.message:'local_check_or_runtime_failed'}. No raw provider error or key is printed.`);process.exitCode=1;
}finally{engine?.close();}

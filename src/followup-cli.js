import path from 'node:path';
import os from 'node:os';
import { Nightvoyage } from './engine.js';
import { BudgetedNightvoyage } from './budgeted-runtime.js';
import { fail } from './store.js';
import { trialFixture } from './trial-config.js';
import { initFollowup, readFollowup, followupPreflight, followupRequestId } from './followup-config.js';

const args=process.argv.slice(2),action=args.shift()??'help';
let directory=path.join(process.env.LOCALAPPDATA??path.join(os.homedir(),'.local','share'),'Nightvoyage','first-fictional-trial');
const position=args.indexOf('--data-dir');
if(position>=0){directory=path.resolve(args[position+1]??'');args.splice(position,2);}
let engine;
try {
  if(action==='init') {
    const i=args.indexOf('--approve-budget-cny');
    initFollowup(directory,{budgetCny:i>=0?args[i+1]:undefined,approveFictionalEgress:args.includes('--allow-fictional-egress')});
    console.log(JSON.stringify(followupPreflight(directory),null,2));
  } else if(action==='preflight')console.log(JSON.stringify(followupPreflight(directory),null,2));
  else if(action==='run') {
    if(!args.includes('--live'))fail('explicit_live_flag_required');
    const config=readFollowup(directory),reader=new Nightvoyage(directory);let existing;
    try {
      existing=reader.store.state.requests[followupRequestId]?.runId;
      if(existing&&reader.run(existing).billingAllowanceId!==config.allowance.id)fail('followup_run_conflict');
      if(existing&&reader.status(existing).status==='completed'){
        console.log(JSON.stringify(reader.result(existing),null,2));reader.close();process.exit(0);
      }
      if(existing&&reader.status(existing).status!=='queued'&&!args.includes('--resume'))fail('explicit_resume_required');
    } finally {reader.close();}
    const check=followupPreflight(directory);
    if(!check.ready){console.log(JSON.stringify(check,null,2));fail('preflight_blocked');}
    const credential=process.env.NIGHTVOYAGE_DEEPSEEK_KEY;
    if(!credential)fail('credential_required');
    engine=new BudgetedNightvoyage(directory,{allowance:config.allowance,credential,enabled:true,mode:'live'});
    const id=engine.start(followupRequestId,followupRequestId,trialFixture(config));
    const stop=()=>engine.cancel(id);process.once('SIGINT',stop);process.once('SIGTERM',stop);
    try {
      if(args.includes('--resume')&&['failed','uncertain'].includes(engine.status(id).status))await engine.resume(id,{retryUnknown:true});
      else await engine.execute(id);
      console.log(JSON.stringify(engine.result(id),null,2));
      if(engine.status(id).status!=='completed')process.exitCode=1;
    } finally {process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
  } else console.log('Grounded wake follow-up: init --approve-budget-cny 3 --allow-fictional-egress | preflight | run --live [--resume] [--data-dir <original-external-directory>]. One additional fictional run / three calls only; original accounting retained. No action sends by default.');
} catch(error) {
  const codes=['followup_run_conflict','explicit_live_flag_required','explicit_followup_approval_required','followup_config_missing_or_unsafe','followup_config_not_reviewed','prior_trial_not_complete','pricing_review_expired','source_withdrawn','preflight_blocked','credential_required','explicit_resume_required','allowance_conflict'];
  console.error(`Nightvoyage follow-up stopped: ${codes.includes(error.message)?error.message:'local_check_or_runtime_failed'}. No raw provider error or key is printed.`);process.exitCode=1;
} finally {engine?.close();}

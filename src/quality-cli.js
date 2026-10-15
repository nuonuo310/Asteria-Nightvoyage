import path from 'node:path';
import os from 'node:os';
import { Nightvoyage } from './engine.js';
import { BudgetedNightvoyage } from './budgeted-runtime.js';
import { fail } from './store.js';
import { qualityProposal, initQualityBatch, readQualityConfig, qualityInput, qualityPreflight, qualityState, qualityRequestId } from './quality-config.js';

let engine;
try {
  const args=process.argv.slice(2),action=args.shift()??'help';
  const caseId=['run','read'].includes(action)?args.shift():undefined;
  const options=new Map();
  while (args.length) {
    const key=args.shift();
    if (!['--data-dir','--approve-budget-cny','--approve-cases','--allow-fictional-egress','--live','--resume'].includes(key)||options.has(key)) fail('invalid_quality_arguments');
    if (['--live','--resume','--allow-fictional-egress'].includes(key)) options.set(key,true);
    else {const value=args.shift();if (!value||value.startsWith('--')) fail('invalid_quality_arguments');options.set(key,value);}
  }
  const allowed={help:[],proposal:[],init:['--data-dir','--approve-budget-cny','--approve-cases','--allow-fictional-egress'],preflight:['--data-dir'],
    run:['--data-dir','--live','--resume'],read:['--data-dir']};
  if (!Object.hasOwn(allowed,action)||[...options.keys()].some(k=>!allowed[action].includes(k))) fail('invalid_quality_arguments');
  const verb=action;
  const directory=options.has('--data-dir')?path.resolve(options.get('--data-dir')):
    path.join(process.env.LOCALAPPDATA??path.join(os.homedir(),'.local','share'),'Nightvoyage','first-fictional-trial');
  if (verb==='proposal') console.log(JSON.stringify(qualityProposal(),null,2));
  else if (verb==='init') {
    initQualityBatch(directory,{budgetCny:options.get('--approve-budget-cny'),approvedCases:options.get('--approve-cases')?.split(','),approveFictionalEgress:options.has('--allow-fictional-egress')});
    console.log(JSON.stringify(qualityPreflight(directory),null,2));
  } else if (verb==='preflight') console.log(JSON.stringify(qualityPreflight(directory),null,2));
  else if (verb==='run'||verb==='read') {
    const requestId=qualityRequestId(caseId);
    if (verb==='run'&&!options.has('--live')) fail('explicit_live_flag_required');
    const check=qualityPreflight(directory,caseId);
    if (check.reason==='quality_approval_required') {console.log(JSON.stringify(check,null,2));fail('quality_approval_required');}
    const config=readQualityConfig(directory),reader=new Nightvoyage(directory);let existing;
    try {
      const state=qualityState(reader.store,config,caseId),item=state.cases.find(c=>c.caseId===caseId);
      existing=item.runId;
      // Store reopen purges withdrawn/deleted bodies before read/replay, even after expiry.
      if (verb==='read'||item.status==='completed') {
        console.log(JSON.stringify(existing?reader.result(existing):{caseId,status:'not_started',qualityAssessed:false},null,2));
        process.exitCode=0;
      } else {
        if (!state.ready) {console.log(JSON.stringify(state,null,2));fail('quality_preflight_blocked');}
        if (existing&&item.status!=='queued'&&!options.has('--resume')) fail('explicit_resume_required');
        // Snapshot is checked again under the writer lock, before reading credentials.
        reader.close();
        engine=new BudgetedNightvoyage(directory,{allowance:config.allowance,mode:'live'});
        const locked=qualityState(engine.store,config,caseId);
        if (!locked.ready) fail('quality_preflight_blocked');
        const input=qualityInput(config,caseId);
        const credential=process.env.NIGHTVOYAGE_DEEPSEEK_KEY;
        if (!credential) fail('credential_required');
        engine.credential=credential;engine.client.enabled=true;
        const id=engine.start(requestId,requestId,input),stop=()=>engine.cancel(id);
        process.once('SIGINT',stop);process.once('SIGTERM',stop);
        try {
          if (options.has('--resume')&&['failed','uncertain'].includes(engine.status(id).status)) await engine.resume(id,{retryUnknown:true});
          else await engine.execute(id);
          console.log(JSON.stringify(engine.result(id),null,2));
          if (engine.status(id).status!=='completed') process.exitCode=1;
        } finally {process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
      }
    } finally {reader.close();}
  } else console.log('Quality screen (no action sends by default): proposal | preflight | read <case> | run <case> --live [--resume] [--data-dir <external-directory>]. init requires separately approved --approve-budget-cny 3 --approve-cases courtyard-cloth,drawer-and-orbit,sparse-context --allow-fictional-egress. Three registered cases / nine calls total; old allowances retained.');
} catch (error) {
  const codes=['invalid_quality_arguments','quality_case_not_reviewed','quality_fixture_changed','quality_protocol_changed','quality_approval_missing_or_unsafe','quality_approval_required','quality_config_not_reviewed','explicit_quality_approval_required','pricing_review_expired','source_withdrawn','quality_run_conflict','quality_preflight_blocked','explicit_live_flag_required','explicit_resume_required','credential_required','allowance_conflict'];
  console.error(`Nightvoyage quality screen stopped: ${codes.includes(error.message)?error.message:'local_check_or_runtime_failed'}. No raw provider error or key is printed.`);process.exitCode=1;
} finally {engine?.close();}

import path from 'node:path';
import os from 'node:os';
import { BudgetedNightvoyage } from './budgeted-runtime.js';
import { Nightvoyage } from './engine.js';
import { Store, fail } from './store.js';
import { initTrial, preflight, readTrial, trialFixture } from './trial-config.js';
const args=process.argv.slice(2),action=args.shift()??'help';
const position=args.indexOf('--data-dir');let directory=path.join(process.env.LOCALAPPDATA??path.join(os.homedir(),'.local','share'),'Nightvoyage','first-fictional-trial');
if(position>=0){directory=path.resolve(args[position+1]??'');args.splice(position,2);}
let engine;
try {
  if(action==='init'){
    const budgetIndex=args.indexOf('--approve-budget-cny');
    const budget=budgetIndex>=0?args[budgetIndex+1]:undefined;
    initTrial(directory,{budgetCny:budget,approveFictionalEgress:args.includes('--allow-fictional-egress')});
    console.log(JSON.stringify(preflight(directory),null,2));
  } else if(action==='preflight') console.log(JSON.stringify(preflight(directory),null,2));
  else if(action==='run') {
    if(!args.includes('--live'))fail('explicit_live_flag_required');
    const slot=Number(args[0]);if(!Number.isInteger(slot)||slot<1||slot>3)fail('slot_must_be_1_to_3');
    const reader=new Nightvoyage(directory);let existingId;
    try {
      existingId=reader.store.state.requests[`trial-slot-${slot}`]?.runId;
      if(existingId&&reader.status(existingId).status==='completed'){console.log(JSON.stringify(reader.result(existingId),null,2));reader.close();process.exit(0);}
      if(existingId&&!args.includes('--resume')&&reader.status(existingId).status!=='queued')fail('explicit_resume_required');
    } finally {reader.close();}
    const check=preflight(directory,Date.now(),slot);if(!check.ready)fail(check.reason);
    // Credential is read only after credential-free preflight succeeds.
    const credential=process.env.NIGHTVOYAGE_DEEPSEEK_KEY;if(!credential)fail('credential_required');
    const config=readTrial(directory);engine=new BudgetedNightvoyage(directory,{allowance:config.allowance,credential,enabled:true,mode:'live'});
    const id=engine.start(`trial-slot-${slot}`,`trial-slot-${slot}`,trialFixture(config));
    const stop=()=>engine.cancel(id);process.once('SIGINT',stop);process.once('SIGTERM',stop);
    try{if(args.includes('--resume')&&['failed','uncertain'].includes(engine.status(id).status))await engine.resume(id,{retryUnknown:true});else await engine.execute(id);console.log(JSON.stringify(engine.result(id),null,2));if(engine.status(id).status!=='completed')process.exitCode=1;}
    finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
  } else if(action==='list'||action==='read') {
    const store=new Store(directory);
    try{console.log(JSON.stringify(action==='list'?Object.keys(store.state.entries):Object.hasOwn(store.state.entries,args[0])?store.state.entries[args[0]]:null,null,2));}finally{store.close();}
  } else {
    console.log('Nightvoyage trial: init --approve-budget-cny <approved amount> --allow-fictional-egress | preflight | run <1..3> --live | list | read <entry-id> [--data-dir <external-directory>]. Key: local NIGHTVOYAGE_DEEPSEEK_KEY environment variable. Default mode sends nothing.');
  }
} catch {console.error('Nightvoyage stopped: preflight, authorization, credential or runtime check failed. Run preflight for budget details. No raw provider error or credential is printed.');process.exitCode=1;}
finally{engine?.close();}

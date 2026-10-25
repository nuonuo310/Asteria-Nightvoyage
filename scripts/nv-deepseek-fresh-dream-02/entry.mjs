// Parent launcher. The credential supplier runs only after the child admission frame.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {inlineChildEnvironment} from '../../src/inline-stub-launcher.js';
import {readOneDreamContract} from './contract.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
export async function launchOneDream(action,directory,{confirmation=null,credentialSupplier}={}){
  if(!['proposal','preflight','init','read','revoke','rehearse','run','resume'].includes(action)||directory!==undefined&&(!path.isAbsolute(directory)||directory.includes('\0'))||directory===undefined&&!['proposal','preflight'].includes(action))return Promise.reject(Error('one_dream_invalid_entry_arguments'));
  const contract=readOneDreamContract({allowExpired:true}).contract;
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--experimental-vm-modules',fileURLToPath(new URL('./worker.mjs',import.meta.url)),action,directory??'-',JSON.stringify(confirmation)],{cwd:root,env:inlineChildEnvironment(),stdio:['pipe','pipe','pipe'],windowsHide:true,shell:false});
    let bytes=0,text='',result,closed=false,stopped=false,requested=0,supplied=0;
    const kill=()=>{stopped=true;child.kill('SIGKILL');},cancel=()=>{stopped=true;child.kill('SIGTERM');},timer=setTimeout(kill,210000);
    process.on('SIGINT',cancel);process.on('SIGTERM',cancel);child.stdin.on('error',()=>{});
    const cleanup=()=>{closed=true;clearTimeout(timer);process.off('SIGINT',cancel);process.off('SIGTERM',cancel);};
    const frame=line=>{
      const value=JSON.parse(line);
      if(value.type==='result'){if(result!==undefined||!value.value||Object.keys(value).length!==2)throw Error();result=value.value;return;}
      if(value.type!=='credential_required'||result!==undefined||requested++||!['run','resume'].includes(action)||Object.keys(value).length!==5||!/^[a-f0-9]{64}$/.test(value.contractHash)||!/^[a-f0-9]{64}$/.test(value.termsHash)||!Number.isSafeInteger(value.nextRequestBytes)||value.nextRequestBytes<1||value.nextRequestBytes>65536||value.nextReservationMicroCny!==contract.pricing.fullPerCallReservationMicroCny||typeof credentialSupplier!=='function')throw Error();
      Promise.resolve().then(()=>{if(closed||stopped)return;supplied++;return credentialSupplier();}).then(key=>{
        if(closed||stopped)return;if(typeof key!=='string'||!/^[\x21-\x7e]{1,2000}$/.test(key)){child.stdin.end();return;}
        const buffer=Buffer.from(JSON.stringify({credential:key}));key=undefined;child.stdin.end(buffer,()=>buffer.fill(0));
      }).catch(()=>child.stdin.end());
    };
    child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{bytes+=Buffer.byteLength(chunk);if(bytes>131072){kill();return;}text+=chunk;let index;while((index=text.indexOf('\n'))>=0){const line=text.slice(0,index);text=text.slice(index+1);try{frame(line);}catch{kill();}}});
    child.stderr.on('data',chunk=>{bytes+=chunk.length;if(bytes>147456)kill();});
    child.on('error',()=>{cleanup();reject(Error('one_dream_entry_refused'));});
    child.on('close',code=>{cleanup();if(stopped||code!==0||text.trim()||result===undefined)reject(Error('one_dream_entry_refused'));else resolve({...result,credentialSupplierCalls:supplied});});
    if(!['run','resume'].includes(action))child.stdin.end();
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2),action=args.shift()??'help',flags={},booleans=['--live','--allow-fictional-egress','--acknowledge-preserved-holds','--acknowledge-mutable-model-alias'];
    while(args.length){const key=args.shift();if(![...booleans,'--data-dir','--confirm-contract','--approve-budget-cny','--approve-case','--account-currency'].includes(key)||Object.hasOwn(flags,key))throw Error();flags[key]=booleans.includes(key)?true:args.shift();if(flags[key]===undefined||typeof flags[key]==='string'&&flags[key].startsWith('--'))throw Error();}
    const allowed={help:[],proposal:[],preflight:['--data-dir'],read:['--data-dir'],revoke:['--data-dir'],rehearse:['--data-dir'],run:['--data-dir','--live'],resume:['--data-dir','--live'],init:['--data-dir','--confirm-contract','--approve-budget-cny','--approve-case','--account-currency','--allow-fictional-egress','--acknowledge-preserved-holds','--acknowledge-mutable-model-alias']};
    if(!Object.hasOwn(allowed,action)||Object.keys(flags).some(key=>!allowed[action].includes(key)))throw Error();
    if(action==='init'&&Object.keys(flags).length!==allowed.init.length)throw Error();
    if(action==='help')console.log('Independent DeepSeek one-dream entry: proposal | preflight [--data-dir <absolute existing Store>] | read | revoke | rehearse | init | run --live | resume --live. init requires the exact new contract hash and all explicit 3 CNY/fixture/CNY-account acknowledgements. No key flag or inherited child key.');
    else{
      if(['run','resume'].includes(action)&&flags['--live']!==true)throw Error();
      const confirmation=action==='init'?{contractHash:flags['--confirm-contract'],budgetCny:flags['--approve-budget-cny']==='3'?3:null,caseId:flags['--approve-case'],allowFictionalEgress:flags['--allow-fictional-egress']===true,acknowledgePreservedHolds:flags['--acknowledge-preserved-holds']===true,acknowledgeMutableModelAlias:flags['--acknowledge-mutable-model-alias']===true,accountCurrency:flags['--account-currency']}:null;
      const credentialSupplier=['run','resume'].includes(action)?()=>process.env.NIGHTVOYAGE_DEEPSEEK_KEY:undefined;
      const value=await launchOneDream(action,flags['--data-dir'],{confirmation,credentialSupplier});console.log(JSON.stringify(value,null,2));
      if(value.status==='blocked'||value.ready===false&&action==='preflight'&&value.reason!=='completed_replay_available'||['run','resume'].includes(action)&&value.status!=='completed')process.exitCode=1;
    }
  }catch{console.error('one_dream_entry_refused');process.exitCode=1;}
}

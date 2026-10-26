// Original project-owned MIT source snapshots, disposable historical tests only.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function freezeOwnerCore(directory){
  const profile=JSON.parse(fs.readFileSync(new URL('../src/continuity-trial-profile.json',import.meta.url),'utf8'));
  const original=[];
  for(const file of ['engine.js','appraisal-rehearsal.js','compact-v2-offline.js','coupled-affect-offline.js','scene-continuity-rehearsal.js','budgeted-runtime.js','compact-trial-config.js','single-scene-diagnostic.js','budget-ledger.js','gated-deepseek-client.js','appraisal-view.js','appraisal-review-memory.js','appraisal-review-store.js']){
    const body=fs.readFileSync(new URL('./legacy-owner-core/'+file,import.meta.url),'utf8').replaceAll('\r\n','\n');
    if(createHash('sha256').update(body).digest('hex')!==profile.protocolSourcePins[file])throw Error('historical_owner_source_mismatch');
    const target=path.join(directory,'src',file);original.push([target,fs.readFileSync(target)]);fs.writeFileSync(target,body);
  }
  const extras=[];
  for(const name of ['inline-child-environment.js','inline-evidence-protocol.js','inline-entry-preflight.js','inline-entry-review.json','inline-entry-admission.js','inline-entry-dependencies.js','inline-entry-graph.json','inline-entry-authorization.js','inline-authorized-runtime.js','inline-stub-launcher.js','inline-stub-worker.js','inline-stub-session.js','inline-bootstrap-graph.json','inline-paid-contract.js','inline-paid-contract-cli.js','inline-trial-policy.js','inline-trial-authorization.js','inline-trial-rehearsal-runtime.js','inline-paid-runtime.js','inline-credential-pipe.js','inline-paid-session.js','inline-paid-worker.js','inline-paid-entry.js','inline-paid-graph.json']){
    const target=path.join(directory,'src',name);if(fs.existsSync(target)){extras.push([target,fs.readFileSync(target)]);fs.rmSync(target);}
  }
  for(const name of fs.readdirSync(path.join(directory,'src'))){if(!name.endsWith('.js')||Object.hasOwn(profile.protocolSourcePins,name))continue;const target=path.join(directory,'src',name);extras.push([target,fs.readFileSync(target)]);fs.rmSync(target);}
  return ()=>{for(const [file,body]of [...original,...extras])fs.writeFileSync(file,body);};
}

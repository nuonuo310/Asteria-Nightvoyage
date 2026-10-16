// Original project-owned MIT source snapshots, disposable historical tests only.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function freezeOwnerCore(directory){
  const profile=JSON.parse(fs.readFileSync(new URL('../src/continuity-trial-profile.json',import.meta.url),'utf8'));
  const original=[];
  for(const file of ['engine.js','appraisal-rehearsal.js','compact-v2-offline.js','coupled-affect-offline.js','scene-continuity-rehearsal.js','budgeted-runtime.js','compact-trial-config.js','single-scene-diagnostic.js','budget-ledger.js','gated-deepseek-client.js','appraisal-view.js']){
    const body=fs.readFileSync(new URL('./legacy-owner-core/'+file,import.meta.url),'utf8').replaceAll('\r\n','\n');
    if(createHash('sha256').update(body).digest('hex')!==profile.protocolSourcePins[file])throw Error('historical_owner_source_mismatch');
    const target=path.join(directory,'src',file);original.push([target,fs.readFileSync(target)]);fs.writeFileSync(target,body);
  }
  const future=path.join(directory,'src','inline-evidence-protocol.js'),extra=fs.existsSync(future)?fs.readFileSync(future):null;
  if(extra)fs.rmSync(future);
  return ()=>{for(const [file,body]of original)fs.writeFileSync(file,body);if(extra)fs.writeFileSync(future,extra);};
}

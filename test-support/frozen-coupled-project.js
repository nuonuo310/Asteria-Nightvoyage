// Original project-owned MIT sources. Disposable historical tests only; never production.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function freezeCoupledCore(directory){
  const profile=JSON.parse(fs.readFileSync(new URL('../src/coupled-trial-profile.json',import.meta.url),'utf8'));
  for(const file of ['budget-ledger.js','gated-deepseek-client.js','budgeted-runtime.js','appraisal-view.js']){
    const body=fs.readFileSync(new URL('./legacy-coupled-core/'+file,import.meta.url),'utf8').replaceAll('\r\n','\n');
    if(createHash('sha256').update(body).digest('hex')!==profile.protocolSourcePins[file])throw Error('historical_coupled_test_source_mismatch');
    fs.writeFileSync(path.join(directory,'src',file),body);
  }
}

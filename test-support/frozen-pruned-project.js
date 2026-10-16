import {freezeOwnerCore} from './frozen-owner-project.js';
// Project-owned MIT historical sources, pinned by the immutable reviewed profile.
// Install into a disposable test copy only. Never rewrites the working checkout.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prunedV2ReviewedConfig } from '../src/pruned-v2-reviewed-profile.js';
export function freezePrunedCore(directory) {
  const restoreOwner=freezeOwnerCore(directory);
  const original=[];
  for(const name of ['budget-ledger.js','gated-deepseek-client.js','budgeted-runtime.js']) {
    const file=path.join(directory,'src',name),body=fs.readFileSync(new URL('./legacy-pruned-core/'+name,import.meta.url),'utf8').replaceAll('\r\n','\n');
    if(createHash('sha256').update(body).digest('hex')!==prunedV2ReviewedConfig().protocolSourcePins[name])throw Error('historical_test_source_mismatch');
    original.push([file,fs.readFileSync(file)]);fs.writeFileSync(file,body);
  }
  return ()=>{for(const [file,body] of original)fs.writeFileSync(file,body);restoreOwner();};
}

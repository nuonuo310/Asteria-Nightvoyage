import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../../../src/contract.js';
import {createR4IdentityManifest} from './identity.mjs';

const directory=fileURLToPath(new URL('.',import.meta.url));
const manifest=createR4IdentityManifest({directory});
const target=path.join(directory,'identity.json');
fs.writeFileSync(target,`${JSON.stringify(manifest,null,2)}\n`,'utf8');
console.log(JSON.stringify({identity:target,identityHash:hash(manifest),
  files:Object.keys(manifest.executionFiles).length,
  sharedFiles:Object.keys(manifest.sharedExecutionFiles).length},null,2));

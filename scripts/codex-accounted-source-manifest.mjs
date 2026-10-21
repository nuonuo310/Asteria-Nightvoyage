// Deterministic manifest printer. It never writes files or executes audited entries.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildManifest} from './codex-accounted-source-inventory.mjs';

if(process.argv.length!==2)throw Error('entry_arguments_invalid');
const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const authority={envelope:'docs/construction-envelopes/2026-10-21-codex-source-admission-v1.md',commit:'f75e4054bd82bbd0c7023f8b3a73536f44d74b97'};
process.stdout.write(JSON.stringify(buildManifest({repoRoot,definitions:{authority}}),null,2)+'\n');

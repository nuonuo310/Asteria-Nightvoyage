import fs from 'node:fs';
import { snapshot } from './contract.js';
// Future adapters must produce exactly this same normalized snapshot contract.
// No Asteria endpoints are implemented or assumed here.
export class FileSnapshotAdapter {
  contractVersion = 1;
  read(file) { return snapshot(JSON.parse(fs.readFileSync(file, 'utf8'))); }
}

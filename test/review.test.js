import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Nightvoyage } from '../src/engine.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/paper-harbor.json',import.meta.url)));
function setup(t){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-review-'));const e=new Nightvoyage(directory);t.after(()=>{e.close();fs.rmSync(directory,{recursive:true,force:true});});return e;}
test('mutating a returned recall cannot erase provenance and bypass withdrawal',async t=>{
 const e=setup(t),id=e.start('r','s',fixture);await e.execute(id);const entry=e.result(id).dream.id;
 const candidate=e.recall('lantern','cue')[0];candidate.sourceRefs.splice(0);candidate.derivedFrom.splice(0);
 assert.equal(e.read(entry).sourceRefs.length,1);
 e.withdraw('fiction-paper');assert.equal(e.read(entry),null);assert.deepEqual(e.recall('lantern','cue'),[]);
});
test('accepted source IDs always fit the withdrawal contract',t=>{
 const e=setup(t),f=structuredClone(fixture);f.sources[0].id='x'.repeat(201);f.channels.memory.sourceIds=[f.sources[0].id];
 assert.throws(()=>e.start('r','s',f),/invalid_source/);
});
test('residue rejects invalid clocks rather than returning nonfinite affect',async t=>{
 const e=setup(t),id=e.start('r','s',fixture);await e.execute(id);const entry=e.result(id).dream.id;
 for(const now of [NaN,Infinity,-Infinity])assert.throws(()=>e.residue(entry,now),/invalid_clock/);
});

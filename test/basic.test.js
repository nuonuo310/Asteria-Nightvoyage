import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Nightvoyage } from '../src/engine.js';
const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/paper-harbor.json', import.meta.url)));
export { fixture };
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-'));
  const e = new Nightvoyage(dir);
  t.after(() => { e.close(); fs.rmSync(dir,{recursive:true,force:true}); });
  return { e, dir };
}
test('fictional local loop persists two scenes, wake, empty insight and typed recall', async t => {
  const { e, dir } = setup(t), id = e.start('r','s',fixture);
  assert.equal((await e.execute(id)).status,'completed');
  const result = e.result(id), dream = result.dream;
  assert.equal(dream.scenes.length,2);
  assert.deepEqual(dream.scenes[1].before,dream.scenes[0].after);
  assert.equal(dream.materialKind,'fictional'); assert.equal(dream.origin,'dream'); assert.equal(dream.isRealityFact,false);
  assert.deepEqual(result.associations,[]);
  assert.equal(e.recall('lantern','cue')[0].origin,'dream');
  assert.deepEqual(e.recall('mountain','other'),[]);
  e.close();
  const reopened = new Nightvoyage(dir);
  assert.equal(reopened.read(dream.id).scenes.length,2); reopened.close();
});
test('recollection and imagined continuation never overwrite original', async t => {
  const { e } = setup(t), id = e.start('r','s',fixture); await e.execute(id);
  const dream = e.result(id).dream, original = e.read(dream.id);
  for (const kind of ['recollection','imagined_continuation']) {
    const child = e.append(dream.id,kind,'A fish-shaped light.');
    assert.equal(e.read(child).origin,kind); assert.deepEqual(e.read(child).derivedFrom,[dream.id]);
  }
  assert.deepEqual(e.read(dream.id),original);
  original.scenes[0].event = 'mutated'; assert.notEqual(e.read(dream.id).scenes[0].event,'mutated');
});
test('cherishing, cue access and wake residue are independent', async t => {
  const { e } = setup(t), id=e.start('r','s',fixture); await e.execute(id);
  const d=e.result(id).dream.id, before=e.read(d).residue;
  e.setPolicy(d,{cherished:true,recallAccess:'manual'});
  assert.deepEqual(e.recall('lantern','cue'),[]); assert.deepEqual(e.read(d).residue,before);
  assert.equal(e.residue(d,before.startedAt+before.durationMs).strength,0);
});
test('absent memory skips, unavailable channels do not smuggle content', t => {
  const { e }=setup(t), f=structuredClone(fixture); f.channels.memory={availability:'absent',sourceIds:[]};
  assert.equal(e.status(e.start('r','s',f)).status,'skipped');
  f.channels.mind={availability:'denied',sourceIds:['fiction-paper']}; assert.throws(()=>e.start('a','b',f),/unavailable_channel/);
});
test('real sources and missing permission are rejected before any call', t => {
  const { e }=setup(t), f=structuredClone(fixture); f.materialKind='real'; assert.throws(()=>e.start('r','s',f),/invalid_snapshot/);
  f.materialKind='fictional'; f.sources[0].grant.dream=false; assert.throws(()=>e.start('r','s',f),/invalid_source/);
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const checkout = fs.realpathSync(fileURLToPath(new URL('..', import.meta.url)));
export const copy = value => structuredClone(value);
export function fail(code) { throw new Error(code); }
export class Store {
  constructor(directory) {
    const resolved = path.resolve(directory);
    // Resolve existing ancestors too, so symlinked parents cannot bypass checkout isolation.
    let ancestor = resolved;
    while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
    const canonical = path.join(fs.realpathSync(ancestor), path.relative(ancestor, resolved));
    if (canonical === checkout || canonical.startsWith(checkout + path.sep)) fail('data_inside_checkout');
    fs.mkdirSync(canonical, { recursive: true, mode: 0o700 });
    if (fs.lstatSync(resolved).isSymbolicLink()) fail('symlink_data');
    this.directory = canonical;
    this.lock = path.join(canonical, 'owner.lock');
    try { this.lockfd = fs.openSync(this.lock, 'wx', 0o600); }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let owner; try { owner = JSON.parse(fs.readFileSync(this.lock, 'utf8')); } catch { fail('lock_requires_manual_recovery'); }
      try { process.kill(owner.pid, 0); fail('store_busy'); }
      catch (e2) { if (e2.code !== 'ESRCH') throw e2; }
      fs.unlinkSync(this.lock);
      this.lockfd = fs.openSync(this.lock, 'wx', 0o600);
    }
    fs.writeFileSync(this.lockfd, JSON.stringify({ pid: process.pid }));
    fs.fsyncSync(this.lockfd);
    try {
      for (const name of ['state.json', 'withdrawals.json', 'snapshot.tmp']) {
        const p = path.join(canonical, name);
        if (fs.existsSync(p) && (!fs.lstatSync(p).isFile() || fs.lstatSync(p).isSymbolicLink())) fail('unsafe_storage_file');
      }
      fs.rmSync(path.join(canonical, 'snapshot.tmp'), { force: true });
      this.withdrawn = this.load('withdrawals.json', []);
      this.state = this.load('state.json', { version: 1, runs: {}, requests: {}, sessions: {}, entries: {}, recalls: {} });
      for (const id of this.withdrawn) this.purge(id);
      for (const run of Object.values(this.state.runs)) {
        if (run.status === 'running') run.status = 'uncertain';
      }
      this.save();
    } catch (e) { this.close(); throw e; }
  }
  load(name, fallback) {
    const p = path.join(this.directory, name);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback;
  }
  atomic(name, value) {
    if (this.closed || this.poisoned) fail('store_unavailable');
    const temp = path.join(this.directory, 'snapshot.tmp');
    try {
      const fd = fs.openSync(temp, 'wx', 0o600);
      try { fs.writeFileSync(fd, JSON.stringify(value)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      fs.renameSync(temp, path.join(this.directory, name));
      let fdDir;
      try { fdDir = fs.openSync(this.directory, 'r'); fs.fsyncSync(fdDir); }
      catch (e) { if (!['EINVAL', 'EPERM', 'EISDIR', 'ENOTSUP'].includes(e.code)) throw e; }
      finally { if (fdDir !== undefined) fs.closeSync(fdDir); }
    } catch { this.poisoned = true; fail('storage_io_failure'); }
  }
  assert() { if (this.closed || this.poisoned) fail('store_unavailable'); }
  save() { this.atomic('state.json', this.state); }
  purge(sourceId) {
    for (const run of Object.values(this.state.runs)) {
      if (run.sourceIds.includes(sourceId)) {
        run.status = 'revoked'; delete run.snapshot; delete run.scenes; delete run.wake;
      }
    }
    for (const [id, entry] of Object.entries(this.state.entries)) {
      if (entry.sourceRefs.some(s => s.id === sourceId)) delete this.state.entries[id];
    }
    // Recall receipts only hold IDs, never body text.
  }
  withdraw(sourceId) {
    this.assert();
    if (!this.withdrawn.includes(sourceId)) this.withdrawn.push(sourceId);
    this.atomic('withdrawals.json', this.withdrawn);
    this.purge(sourceId); this.save();
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.lockfd !== undefined) { fs.closeSync(this.lockfd); fs.rmSync(this.lock, { force: true }); }
  }
}

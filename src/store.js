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
      const recovery = path.join(canonical, 'recovery.lock');
      try { fs.mkdirSync(recovery, { mode: 0o700 }); } catch { fail('recovery_busy_or_manual_cleanup_required'); }
      try {
        let owner; try { owner = JSON.parse(fs.readFileSync(this.lock, 'utf8')); } catch { fail('lock_requires_manual_recovery'); }
        if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0) fail('invalid_owner_lock');
        try { process.kill(owner.pid, 0); fail('store_busy'); }
        catch (e2) { if (e2.code !== 'ESRCH') throw e2; }
        fs.unlinkSync(this.lock);
        this.lockfd = fs.openSync(this.lock, 'wx', 0o600);
      } finally { fs.rmdirSync(recovery); }
    }
    fs.writeFileSync(this.lockfd, JSON.stringify({ pid: process.pid }));
    fs.fsyncSync(this.lockfd);
    try {
      for (const name of ['state.json', 'withdrawals.json', 'deletions.json', 'snapshot.tmp']) {
        const p = path.join(canonical, name);
        if (fs.existsSync(p) && (!fs.lstatSync(p).isFile() || fs.lstatSync(p).isSymbolicLink())) fail('unsafe_storage_file');
      }
      fs.rmSync(path.join(canonical, 'snapshot.tmp'), { force: true });
      this.withdrawn = this.load('withdrawals.json', []);
      this.deletions = this.load('deletions.json', []);
      this.state = this.load('state.json', { version: 1, runs: {}, requests: {}, sessions: {}, entries: {}, recalls: {} });
      if (this.state.version !== 1 || !Array.isArray(this.withdrawn) || !this.withdrawn.every(id => typeof id === 'string') || !Array.isArray(this.deletions)) fail('invalid_storage_version_or_journal');
      for (const id of this.withdrawn) this.purge(id);
      for (const deletion of this.deletions) this.applyDeletion(deletion);
      for (const run of Object.values(this.state.runs)) {
        if (run.status === 'running') run.status = 'uncertain';
      }
      if (this.state.billing) {
        if (this.state.billing.version !== 1 || !this.state.billing.accounts) fail('invalid_billing_version');
        for (const account of Object.values(this.state.billing.accounts)) {
          for (const attempt of Object.values(account.attempts)) {
            if (['reserved','dispatched'].includes(attempt.status)) attempt.status = 'unknown';
          }
        }
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
    if (typeof sourceId !== 'string' || !sourceId || sourceId.length > 200) fail('invalid_source_id');
    if (!this.withdrawn.includes(sourceId)) this.withdrawn.push(sourceId);
    this.atomic('withdrawals.json', this.withdrawn);
    this.purge(sourceId); this.save();
  }
  applyDeletion({ entryId, runId, wholeRun }) {
    for (const [id, entry] of Object.entries(this.state.entries)) {
      if (id === entryId || (wholeRun && entry.runId === runId)) delete this.state.entries[id];
    }
    if (wholeRun && Object.hasOwn(this.state.runs, runId)) {
      const r = this.state.runs[runId];
      if (r.status !== 'revoked') r.status = 'deleted';
      delete r.snapshot; delete r.scenes; delete r.wake;
    }
  }
  deleteEntry(entry) {
    this.assert();
    const deletion = { entryId: entry.id, runId: entry.runId, wholeRun: entry.origin === 'dream' };
    this.deletions.push(deletion);
    this.atomic('deletions.json', this.deletions);
    this.applyDeletion(deletion); this.save();
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.lockfd !== undefined) { fs.closeSync(this.lockfd); fs.rmSync(this.lock, { force: true }); }
  }
}

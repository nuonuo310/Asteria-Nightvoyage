import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const contract = 'nightvoyage-offline-integration-capability-v1';
const dummy = 'nightvoyage-offline-integration-capability-v1\n';
const knownErrorCodes = new Set(['EPERM', 'EACCES', 'ENOTSUP']);

function boundedErrorCode(error) {
  return knownErrorCodes.has(error?.code) ? error.code : 'unknown';
}

function removeOwnedLink(link) {
  try {
    let entry;
    try {
      entry = fs.lstatSync(link);
    } catch (error) {
      if (error?.code === 'ENOENT') return true;
      throw error;
    }
    if (!entry.isSymbolicLink()) return false;
    fs.unlinkSync(link);
    return true;
  } catch {
    return false;
  }
}

function removeOwnedFile(file) {
  try {
    const entry = fs.lstatSync(file);
    if (!entry.isFile() || entry.isSymbolicLink()) return false;
    fs.unlinkSync(file);
    return true;
  } catch (error) {
    return error?.code === 'ENOENT';
  }
}

function removeOwnedDirectory(directory) {
  try {
    const entry = fs.lstatSync(directory);
    if (!entry.isDirectory() || entry.isSymbolicLink()) return false;
    fs.rmdirSync(directory);
    return true;
  } catch (error) {
    return error?.code === 'ENOENT';
  }
}

function probeLink(kind, target, link, expectedDirectoryEntry) {
  try {
    fs.symlinkSync(target, link, kind);
    const entry = fs.lstatSync(link);
    if (!entry.isSymbolicLink()) return {status: 'unsupported', errorCode: 'unknown'};
    if (fs.realpathSync(link) !== fs.realpathSync(target)) return {status: 'unsupported', errorCode: 'unknown'};
    if (kind === 'file') {
      if (fs.readFileSync(link, 'utf8') !== dummy) return {status: 'unsupported', errorCode: 'unknown'};
    } else {
      const entries = fs.readdirSync(link);
      if (entries.length !== 1 || entries[0] !== expectedDirectoryEntry) return {status: 'unsupported', errorCode: 'unknown'};
      if (fs.readFileSync(path.join(link, expectedDirectoryEntry), 'utf8') !== dummy) return {status: 'unsupported', errorCode: 'unknown'};
    }
    return {status: 'supported', errorCode: null};
  } catch (error) {
    return {status: 'unsupported', errorCode: boundedErrorCode(error)};
  }
}

function cleanupOwned(root) {
  if (!root) return 'not_created';
  let complete = true;
  for (const name of ['file-link', 'directory-link']) complete = removeOwnedLink(path.join(root, name)) && complete;
  complete = removeOwnedFile(path.join(root, 'target.txt')) && complete;
  complete = removeOwnedFile(path.join(root, 'directory-target', 'inside.txt')) && complete;
  complete = removeOwnedDirectory(path.join(root, 'directory-target')) && complete;
  complete = removeOwnedDirectory(root) && complete;
  return complete ? 'complete' : 'failed';
}

if (process.argv.length > 2) {
  console.log(JSON.stringify({contract, status: 'arguments_rejected', node: process.version, platform: process.platform, arch: process.arch}, null, 2));
  process.exitCode = 1;
} else {
  let root = null;
  const report = {contract, node: process.version, platform: process.platform, arch: process.arch};
  try {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightvoyage-offline-integration-capability-'));
    const fileTarget = path.join(root, 'target.txt');
    const directoryTarget = path.join(root, 'directory-target');
    const fileLink = path.join(root, 'file-link');
    const directoryLink = path.join(root, 'directory-link');
    const directoryEntry = 'inside.txt';
    fs.writeFileSync(fileTarget, dummy, {flag: 'wx'});
    fs.mkdirSync(directoryTarget);
    fs.writeFileSync(path.join(directoryTarget, directoryEntry), dummy, {flag: 'wx'});
    report.fileSymlink = probeLink('file', fileTarget, fileLink, directoryEntry);
    report.directorySymlink = probeLink('dir', directoryTarget, directoryLink, directoryEntry);
    const supported = report.fileSymlink.status === 'supported' && report.directorySymlink.status === 'supported';
    report.status = supported ? 'capability_available' : 'capability_unavailable';
    if (!supported) process.exitCode = 1;
  } catch (error) {
    report.status = 'probe_failed';
    report.errorCode = boundedErrorCode(error);
    process.exitCode = 1;
  } finally {
    report.ownedCleanup = cleanupOwned(root);
    if (report.ownedCleanup !== 'complete' && report.ownedCleanup !== 'not_created') {
      report.status = 'blocked_cleanup_failed';
      process.exitCode = 1;
    }
  }
  console.log(JSON.stringify(report, null, 2));
}
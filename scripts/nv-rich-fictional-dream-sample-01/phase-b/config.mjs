// Frozen Phase B wiring values. The Phase A manifest remains untouched.
import {fileURLToPath} from 'node:url';

export const phaseBConfigVersion='nv-rich-fictional-dream-sample-phase-b-config-v1';
export const phaseBIdentityVersion='nv-rich-fictional-dream-sample-phase-b-identity-v1';
export const phaseBWorkerVersion='nv-rich-fictional-dream-sample-phase-b-worker-v1';
export const phaseBTransportVersion='nv-rich-fictional-dream-sample-phase-b-https-v1';

export const phaseAHead='c9c0438945bb35a1b507ca14166136c4292f73ec';
export const phaseATree='375bc898da910d2311903ed9a4a74df50f2d95a0';
export const phaseAParent='621074a9a57772d957e43bed8d26ea7fae3a0561';
export const phaseAIdentityHash='851e443a44bb044e8f2153dd791cc47ec653713b3bdc7339c5a0513cbc2c44ea';
export const phaseAPromptHash='23ab5917e42bfbcf4f6072f43142d5d32b9c7e47f3d19b426aaa49612bf15bea';
export const phaseASourceHash='605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6';
export const phaseAPriceSnapshotHash='4a4cfc970a3e285756b9ce0703467c13ff3b76da4578a0f7e9f637d4a3ecd00d';

export const phaseBStoreDirectory='C:\\Users\\Administrator\\AppData\\Local\\Nightvoyage\\rich-fictional-dream-sample-01';
export const phaseBReleasePath=fileURLToPath(new URL('./release.json',import.meta.url));
export const phaseBExpectedReleaseHash='3f14ffc735dcb62284424378b3596312976f14a7b6e36fb45b26e5886ae60969';
export const phaseBReleaseKeys=Object.freeze([
  'status','phaseAHead','phaseATree','identityHash','promptHash','sourceHash',
  'priceSnapshotHash','allowanceCapMicroCny','maxRuns','maxCalls',
  'storeDirectory','noRetry'
]);
export const phaseBAllowanceCapMicroCny=480000;
export const phaseBMaxRuns=3;
export const phaseBMaxCalls=12;
export const phaseBMaxOutputTokens=400;
export const phaseBRequestByteLimit=16384;
export const phaseBPriceExpiresAt=Date.parse('2026-10-28T00:00:00Z');
export const phaseBPricePageUrl='https://api-docs.deepseek.com/zh-cn/quick_start/pricing/';
export const phaseBTransportEndpoint='https://api.deepseek.com/chat/completions';
export const phaseBTransportTimeoutMs=55000;
export const phaseBWorkerTimeoutMs=900000;

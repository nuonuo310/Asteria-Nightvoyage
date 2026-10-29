import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {copy,fail} from '../../../src/store.js';
import {r8PricePageSha256,r8PricePageUrl} from './config.mjs';
import {r8PriceSnapshot} from './price.mjs';

const expected=[
  '模型 deepseek-flash (1) deepseek-v4-pro',
  '模型版本 DeepSeek-V4.1-Flash-1017 DeepSeek-V4-Pro-0813',
  '百万tokens输入 （缓存未命中） 空闲时段 1元 4.5元 高峰时段 2元 9.0元',
  '百万tokens输出 空闲时段 4元 13.5元 高峰时段 8元 27.0元'
];

export function verifyR8PriceEvidence(file){
  if(typeof file!=='string'||!path.isAbsolute(file))
    fail('dream_climate_r8_price_evidence_path_required');
  const resolved=path.resolve(file);
  let stat;
  try{stat=fs.lstatSync(resolved);}catch{fail('dream_climate_r8_price_evidence_unreadable');}
  if(stat.isSymbolicLink()||!stat.isFile()||stat.size<1||stat.size>1048576)
    fail('dream_climate_r8_price_evidence_invalid');
  const bytes=fs.readFileSync(resolved),text=bytes.toString('utf8');
  if(!Buffer.from(text,'utf8').equals(bytes))
    fail('dream_climate_r8_price_evidence_invalid_utf8');
  const pageSha256=createHash('sha256').update(bytes).digest('hex');
  if(pageSha256!==r8PricePageSha256)fail('dream_climate_r8_price_page_changed');
  const normalized=text.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
  if(expected.some(fragment=>!normalized.includes(fragment)))
    fail('dream_climate_r8_price_page_changed');
  return {...copy(r8PriceSnapshot),evidencePath:resolved,source:r8PricePageUrl,pageSha256};
}

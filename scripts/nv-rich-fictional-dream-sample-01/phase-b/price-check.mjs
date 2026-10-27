import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {fail} from '../../../src/store.js';
import {phaseBPriceExpiresAt,phaseBPricePageUrl} from './config.mjs';

const expected=[
  '模型 deepseek-flash (1) deepseek-v4-pro',
  '模型版本 DeepSeek-V4.1-Flash-1017 DeepSeek-V4-Pro-0813',
  '百万tokens输入 （缓存未命中） 空闲时段 1元 4.5元 高峰时段 2元 9.0元',
  '百万tokens输出 空闲时段 4元 13.5元 高峰时段 8元 27.0元'
];

export function verifyPhaseBPriceEvidence(file,{now=Date.now()}={}){
  if(typeof file!=='string'||!path.isAbsolute(file))fail('rich_sample_price_evidence_path_required');
  if(!Number.isFinite(now)||now<0)fail('invalid_rich_sample_clock');
  if(now>=phaseBPriceExpiresAt)fail('rich_sample_price_snapshot_expired');
  const bytes=fs.readFileSync(file),text=bytes.toString('utf8');
  if(!Buffer.from(text,'utf8').equals(bytes))fail('rich_sample_price_evidence_invalid_utf8');
  const normalized=text.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
  if(expected.some(fragment=>!normalized.includes(fragment)))fail('rich_sample_price_page_changed');
  return {
    source:phaseBPricePageUrl,
    observedAt:now,
    pageSha256:createHash('sha256').update(bytes).digest('hex'),
    modelAlias:'deepseek-flash',
    observedModelAlias:'DeepSeek-V4.1-Flash-1017',
    peakInputMicroCnyPerMillion:2000000,
    peakOutputMicroCnyPerMillion:8000000,
    currency:'CNY',
    exactReviewedRates:true
  };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='check'||!args[1]||args[1].startsWith('--')){
    console.error('Usage: node scripts/nv-rich-fictional-dream-sample-01/phase-b/price-check.mjs check <absolute saved official pricing HTML>');
    process.exitCode=1;
  }else{
    try{console.log(JSON.stringify(verifyPhaseBPriceEvidence(args[1]),null,2));}
    catch(error){console.error(error.message);process.exitCode=1;}
  }
}

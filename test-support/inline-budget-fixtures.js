// Synthetic prices/usage are algorithm probes, not a current reviewed tariff.
export {inlineSeed,inlineResponse} from './inline-runtime-fixtures.js';
export const inlineStubAllowance=(changes={})=>({id:'independent-inline-stub',mode:'stub',approved:true,expiresAt:Date.now()+60000,limits:{maxRuns:1,maxCalls:3,maxMicroCny:3000000},pricing:{model:'deepseek-flash',contextTokenLimit:1100000,inputMicroCnyPerMillion:2000000,outputMicroCnyPerMillion:8000000,checkedAt:1,reference:'https://api-docs.deepseek.com/synthetic-fixture-not-price-review'},...changes});

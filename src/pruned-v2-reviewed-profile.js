// Fixed historical contract data, not permission to initialize or dispatch.
const reviewed={
  "schemaVersion": 1,
  "batchId": "pruned-v2-dream-trial-20261015",
  "protocolVersion": "compact-appraisal-quotes-v2-pruned-unused",
  "protocolSourcePins": {
    "compact-appraisal-protocol.js": "935762c0e5961b0abcd38d0d5a959ff40ebd97e051a1236e57c7ab3fb8118e34",
    "appraisal-rehearsal.js": "361f2a81e4dc63ca7f6f138032fc65d649e53f1b3039cd0841f614396d1cc23f",
    "deepseek-protocol.js": "0f8471c69f170ec74880ef0e7deef8889df8a3b12e6e86c0aea2b13fcefa681e",
    "validation-diagnostic.js": "931a0bd25e03755570a8931fc5efa4d25a2c2548b164ede0051b005b17d9c0be",
    "compact-v2-offline.js": "097857494759b96d0a18338a0b071c3d3b8c6832441ec91a19b786b67b244c10",
    "compact-v2-protocol.js": "a9e26e5ffe8dee7102e695af7dd9ee92f90426d7d94b126126f171be6a0a312b",
    "budget-ledger.js": "bd71f25562edf177e736cf19aa45c989826584897918f471fa263ac4401ec1d5",
    "gated-deepseek-client.js": "33e629221ca69e8dc6f1c719dcf6e0faad3b70d385021af4a48da591c9b22149",
    "budgeted-runtime.js": "2739b3c0513ddcb1d833c26175fd3f07836cd4c12d76d7c73621d54670fa3871"
  },
  "caseId": "sparse-context",
  "fixtureSha256": "66a19f5968bc0bb60c8ff4918d6e57e223b008329c2a7028f3ac478cb6256d10",
  "sourceRefs": [
    {
      "id": "q-sparse-memory",
      "version": "1"
    }
  ],
  "model": "deepseek-flash",
  "expiresAt": 1792152600000,
  "proposedAdditionalBudgetCny": 3,
  "maxAdditionalRuns": 1,
  "maxAdditionalCalls": 3,
  "perCallOutputTokens": 400,
  "persistsGeneratedBody": true,
  "requiresPreservedHoldsAcknowledgement": true,
  "continuesPriorRun": false,
  "fixtureEgressApproved": true,
  "paidEvaluationApproved": true,
  "qualityAssessed": false,
  "allowance": {
    "id": "pruned-v2-dream-trial-20261015",
    "mode": "live",
    "approved": true,
    "expiresAt": 1792152600000,
    "limits": {
      "maxRuns": 1,
      "maxCalls": 3,
      "maxMicroCny": 3000000
    },
    "pricing": {
      "model": "deepseek-flash",
      "contextTokenLimit": 1100000,
      "inputMicroCnyPerMillion": 2000000,
      "outputMicroCnyPerMillion": 8000000,
      "reference": "https://api-docs.deepseek.com/zh-cn/quick_start/pricing/",
      "checkedAt": 1792066200000
    },
    "protocolVersion": "compact-appraisal-quotes-v2-pruned-unused"
  }
};
export const prunedV2ReviewedConfig=()=>structuredClone(reviewed);
export function prunedV2ReviewedProposal(){const p=prunedV2ReviewedConfig();delete p.allowance;p.fixtureEgressApproved=false;p.paidEvaluationApproved=false;return p;}

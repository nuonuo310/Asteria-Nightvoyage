# NV-DREAM-CLIMATE-OFFLINE-01 R9 离线验证

状态：`READY_FOR_HUMAN_OFFLINE_REVIEW_R9`

- 权威提交：`b3181f987a6d611bb8d49c4776b8873292bab25f`
- 权威文件：`docs/construction-envelopes/2026-10-28-dream-climate-offline-v1.md`
- 固定实现起点：`fe0b196a0a22210107205a0a6660955251c8f724`
- 沿用 worktree、分支 `codex/nightvoyage-dream-climate-offline-01` 和 Draft PR #109。
- 本轮只做离线、可审计的 UNKNOWN canonicalization；没有生成 live release，没有 secure-input 命令，没有读取 Key、余额、真实 Store 或价格网络，没有调用模型。

## 候选变更

- normalization：`nv-dream-climate-offline-normalization-v1` → `nv-dream-climate-offline-normalization-v2`。
- 审计策略：`unbased-appraisal-unknown-v1`；每个实际被 canonicalize 的维度都记录 `dimension`、`receivedValue`、`canonicalValue: 0.5`、`rule: unbased_requires_unknown`。
- 仅当 `basis.control`/`basis.uncertainty` 为 `null`，且模型原值是合法有限范围数但不是 `0.5` 时，才把 canonical appraisal 降级为 `0.5`。非法有限性、越界、非零 goal 无证据、非法/跨幕引文、非法 affect、额外字段和错误 schema 继续拒绝。
- event、引文、`goalEffect`、`basis.goal`、`affect.kind`、delta 和 affect excerpt 均未被 canonicalization 改写。
- 审计绑定 `sceneIndex`/`requestId`，以 `integrityHash` 覆盖原始 projection；随 scene checkpoint 同对象保存、同 hash 校验。删除、改写 `receivedValue`/`canonicalValue`/`rule`/`dimension`、换 index/request ID 或删除审计均拒绝。
- 模型 material 和默认梦簿发布面都会移除技术审计；技术审计只保留在 run/scene checkpoint 与显式 receipt 中。

## 身份与旧入口

- 旧 R8 offline identity：`e574d505ca4ce104507af00b19f72f63c99658d65cab1918ff6c3ad903e2287a`。
- 新 R9 offline identity：`153503232906afd729d78054cc199ee71a9ea6aca8ebfd7ddfb6ebe7283ac867`。
- 新 execution file 哈希：
  - `protocol.mjs`: `eaa5e46cccfc1464a2eb35886a6b7bc1406094112281b6d9fc199c962a85b54a`
  - `offline-check.mjs`: `40c55098537a773cc020f13290f065112bf147859a0b68e83a2a976df252efd1`
- prompt hash 和 source hash 未改：`89b1d4a87d53f41b697341dd32fb4bb3ad41b665e2a47b68a3d5e5464cbf3c38` / `605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6`。
- 旧 R8 execution pin `ba7444d97ecbf21afab5d3e179db26505bbe0b9d52caee29fc4a2c0d8319ad00` 未刷新；旧 identity 与旧 release 在凭据、真实 Store 和网络之前失败关闭。旧 release 现在明确返回 `dream_climate_r8_release_superseded`。
- 未生成新的 executable live release；PR 保持 Draft。

## 有限验证结果

命令与实数：

```text
node --test test/dream-climate-offline-r9.test.js
tests 11 / pass 11 / fail 0

node --test test/dream-climate-offline-r7.test.js
tests 4 / pass 4 / fail 0

node --test test/dream-climate-offline.test.js
tests 11 / pass 11 / fail 0

node scripts/nv-dream-climate-offline-01/offline-check.mjs
status READY_FOR_HUMAN_OFFLINE_REVIEW
normalization nv-dream-climate-offline-normalization-v2
requests 12 / cases 3 / credentialReads 0 / networkAttempts 0 / paidCalls 0

git diff --check
clean
```

R9 专项覆盖：

1. R8 精确对象经实际候选 normalization：event 逐字符不变，`goalEffect`/`control`/affect 不变，`uncertainty` 从 received `0.6` canonicalize 为 `0.5`，审计恰有一项。
2. control/uncertainty 各自 null + 非 `0.5`、两维同时、null + `0.5`、合法本幕引文均通过；canonicalization 幂等，合法有证据值不降级。
3. 非有限/越界、非零 goal 无证据、跨幕/不存在引文、非法 affect、额外字段全部拒绝。
4. checkpoint round-trip 保留 canonical 值和原值审计；审计字段任意改写、删除 item、换 `sceneIndex`/`requestId`、删除审计均拒绝。builder 不把技术审计注入 narrative/source/basis。
5. synthetic 单场 3 scene + wake 完整闭环：第一幕为 R8 精确对象，4 calls，3 draft/正式 scene，fragment 逐字来源，firstFeeling 四态之一，residue 独立模拟，后来回忆为空；只用 fake transport 和临时目录。
6. fake 非法 goal/引文/affect 均在首处失败：1 call，usage settled 恰一次，0 publish，0 retry。
7. R8 旧 identity/release 失败关闭；credential supplier 读取 0 次，Store 创建 0，网络 0；旧 phase-b live 入口仍 blocked。

首次失败与修正：R9 专项首次运行在测试导入处失败（`profile.mjs` 未导出 `r8RunId`，`SyntaxError`），改为从 `config.mjs` 导入；随后临时 Store 基名和 receipt residue 字段名按既有公共约定修正。实现语义未因此改变。首次失败不是内容通过证据。

## R8 固定事实与边界

- R8 receipt SHA-256 仍为 `034b53bd5ea4b59f7033c19cc556bdc0be2cb9addc6034937c7dea5e18f02c2a`。
- R8 settled 计算额仍为 `3316` micro-CNY，unknown 仍为 `0`；历史 receipt、Store、账务和 R1–R8 文档没有改写。
- 本轮不重跑 R8，不补跑，不产生新费用，不读取真实 Store/Key/余额，不访问价格网络，不生成 live release。
- 验证只证明结构处理、审计完整性、账务/发布边界；不证明文学质量、语义支持、模型长期服从率或 V1 完整验收。synthetic 结果不是真实梦。

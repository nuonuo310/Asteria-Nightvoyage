# 版本化源码准入与刚醒时心情

状态：独立草稿候选；`BLOCKED_PAID` 保持，`wake-first-feeling-v1` 仅完成离线合成验收。基准为 `main@249d38ab6eb65aeab3207771062b0e51b962bd4d`，施工权威为 `codex/nightvoyage-versioned-wake-admission-01@6e49398f881079491cc2cfcf5fffded9a4efcb70`。本候选不修改基准、原 WIP、冻结清单、旧批准、账本、用户 Store、凭据或真实模型。

## 两个源码身份

旧身份不是一个可忽略的新增文件差异，而是旧审阅证据的完整内容身份：

| 身份 | 文件集 | 内容摘要 | 预期 |
| --- | --- | --- | --- |
| 冻结历史身份 | `src/inline-entry-review.json.files` 的 86 个路径 | 清单 Git blob 的 LF 规范 SHA-256 `21e08f54…52d6a`；规范化 inventory hash `b4a06bae…908d` | 按原证据重放旧入口与历史 guard 的正例 |
| 当前候选身份 | 同一递归范围新增 `src/wake-first-feeling.js`、`fixtures/wake-first-feeling.json`，共 88 个路径 | inventory hash `6307428d…6381` | 旧入口、旧合同和旧 guard 必须失败关闭 |

历史正例只在临时目录中按冻结清单逐文件校验 LF 规范化 SHA-256 后重建，且重建后的递归 inventory 必须与该清单完全相等。测试不会把当前 `src/` 的额外文件当作历史身份，也不刷新或重签清单。当前身份中的实现没有移到清单范围之外。

## 依赖图

| 触点 | 依赖路径 | 新身份结果 |
| --- | --- | --- |
| 旧源码准备 | `inline-entry-preflight.js` → `inlineEntryInventory()` → `src/` + `fixtures/` + `package.json` | `source_inventory_changed`，`sourceInventoryMatches:false` |
| 旧付费合同 | `inline-paid-contract.js` → `validateInlinePaidContract()` → 旧 preflight | `paid_contract_source_changed` |
| 旧 owner-locked 历史 guard | `inline-entry-admission.js` → 默认 preflight | `admission_source_changed` |
| 旧 trial/paid runtime | `inline-trial-authorization.js` / `inline-paid-runtime.js` → 旧合同 | 在账户创建、凭据请求和 transport 前阻断 |
| 旧事件审计中的合同检查 | `test/response-event-*.test.js` → 旧合同 | 当前身份拒绝，冻结身份通过 |
| 新刚醒心情 | `src/wake-first-feeling.js` ↔ `fixtures/wake-first-feeling.json` | 自有 `wake-first-feeling-v1` / `wake-first-feeling-view-v1` 和独立 source/data 身份文件 |

WIP 报告的 `167` 项失败全部归因于旧测试把“当前 checkout”当作冻结身份，而不是把两件事同时表达：源码/清单假设、旧合同读取、历史 guard、trial/paid runtime、事件审计中的旧合同断言。迁移后每类都同时保留当前拒绝和冻结历史正例；没有删除、跳过、恒真化或放宽旧门禁。

## 刚醒心情候选

- 身份：`schemaVersion:1`、`origin:wake_first_feeling`、`derivedFrom:[dreamId]`、独立 UUID、单调 `order`、`recordedAt` 和来源引用。
- 内容：只接受调用方显式提交的虚构文字；`present` 必须有文字，`absent`/`uncertain` 明确无文字。没有从 valence、arousal、`wake.fragment`、模拟 residue 或后来回想推导情绪。
- 不变量：原梦、逐字 wake 残片、模拟 residue、旧回想、回执和账本不改写；写入只追加新条目和独立 journal。
- 撤回与删除：仍走既有 `Store.purge` / deletion 规则；重开不复活，也不交付已撤回或已删除内容。
- 输出：只读投影和终端渲染；没有真实模型、Asteria 接入或前端美化。文本 JSON 引用，控制字符和标签样式文本保持惰性。

## 合成闭环与回执

固定虚构 fixture、三次假调用、两幕原梦和逐字 wake 残片：

```sh
node scripts/wake-first-feeling-demo.mjs
node scripts/check-versioned-wake-admission.mjs
node --test test/wake-first-feeling.test.js test/versioned-wake-admission.test.js
```

完整回执：`docs/validation/versioned-wake-admission-validation.json`。2026-10-26 Windows 实跑 `npm.cmd test` 为 1,935/1,935、exit 0；定向组为 13、167、54 项全过；8 个检查脚本均 exit 0。

验收回执同时记录：旧清单 LF 规范文件与 inventory hash、当前与冻结两种 preflight、两种合同结果、当前旧付费入口直接拒绝且零凭据供应、四笔旧 unknown 合计 `8812800` micro-CNY、刚醒记录顺序/来源、后来回想、residue 只是模拟估计、原梦/回执/账本不变，以及 `credentialReads:0`、`networkAttempts:0`、`realModelRequests:0`、`userStoreAccessed:false`。

## 完成边界

本候选不提供新的付费 profile、价格、预算、live 授权、凭据通道或真实请求；不释放或重结旧 unknown；不声称现实主观感受、语义支持或梦境质量已验收。完整测试与剩余限制见本分支 PR 的测试回执。

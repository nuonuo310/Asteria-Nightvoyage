# NV-GENERATED-WAKE-OFFLINE-01 本地验证回执

- 回执状态：`COMPLETE_SYNTHETIC_ONLY`
- 交付状态：本地提交完成；远端推送与 Draft PR 待一次核验。若网络不可用，交付状态为 `BLOCKED_DELIVERY`。
- 实现基线：`4e994b5f2ab0c42df4bdb9cff2a95aa9fc96d94f`
- 基准分支：`codex/nightvoyage-versioned-wake-admission-impl-01`
- 实现分支：`codex/nightvoyage-generated-wake-offline-01`
- Node：`v24.19.0`；平台：`win32`；包管理器：`npm.cmd`
- 权威文档副本来源：`docs/validation/generated-wake-offline-source-v1.md`

## 边界证明

| 项目 | 实测结果 |
| --- | --- |
| 旧付费入口 | `inline_paid_entry_refused` |
| 旧入口凭据供应调用 | `0` |
| 旧入口历史字节 | 未改变 |
| 旧入口 `owner.lock` | 不存在 |
| 当前 preflight | `source_inventory_changed` |
| 当前付费合同 | `paid_contract_source_changed` |
| 历史 preflight 源匹配 | `true` |
| 历史暂停金额 | `8812800` micro-CNY |
| 旧合同源固定 | `true` |
| 旧合同批准状态 | `false` |
| 原梦场景 | `2` |
| 第三次 wake 片段逐字匹配 | `true` |
| fake 调用数 | `3` |
| settled 行数 | `3` |
| 单次输出上限 | `400` tokens |
| 刚醒心情来源 | `generated_fictional_wake` |
| wake attempt 索引 | `2` |
| residue 类型 | `simulated_estimate` |
| 记录时间来源 | 本地提交时间，不是主观发生时间 |
| 用户 Store 访问 | `false` |
| Key 读取 | `0` |
| 网络请求 | `0` |
| 真实模型请求 | `0` |
| 旧清单刷新 | `false` |
| 旧许可复用 | `false` |
| 旧梦迁移 | `false` |
| 原梦与旧账改写 | `false` |

旧清单 LF SHA-256 为 `21e08f5444ef0923d9bdc8bc9b2736a1f491601cb3dd960a5b4107ff37d52d6a`，旧库存哈希为 `b4a06baeaeb4d9cf572bb349117d651db993957f413518a4b7ea1caf975a908d`，均保持原值。新库存哈希为 `0801171e5406bdddf98874c731068824e6f46ba8140b2cec6b3c940ccc292c9a`，新增文件集为六个：`fixtures/generated-wake-offline.js`、`fixtures/wake-first-feeling.json`、`src/generated-wake-protocol.js`、`src/generated-wake-records.js`、`src/generated-wake-runtime.js`、`src/wake-first-feeling.js`。

## 测试实数

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `node --test test/generated-wake-offline.test.js` | `0` | 12 项，12 通过，0 失败 |
| `node --test test/versioned-wake-admission.test.js` | `0` | 1 项，1 通过，0 失败 |
| `node scripts/check-generated-wake-offline.mjs` | `0` | `COMPLETE_SYNTHETIC_ONLY` |
| `node scripts/check-versioned-wake-admission.mjs` | `0` | 旧入口关闭、历史证据通过 |
| `node scripts/generated-wake-offline-demo.mjs` | `0` | 三次 fake 阶段与只读视图输出 |
| `npm.cmd test` | `0` | 1947 项，1947 通过，0 失败，467797.15 ms |
| `git diff --check` | `0` | 无空白错误；仅 LF/CRLF 提示 |

## 开发失败记录

第一次完整 `npm.cmd test` 在负载下出现一项时序失败：`test/codex-accounted-wait-owner.test.js:15` 的本地转发计数为 0 而非 1，总计 1946 项、1945 通过、1 失败。隔离重跑该文件为 9 项全通过；最终完整套件为 1947 项全通过。该失败不涉及本候选的生成、记录或读视图代码。早先一次完整运行还出现 Windows 无符号链接权限的 `EPERM`，后续套件未复现，未修改任何旧测试以跳过该检查。

## 未解决项

- 远端 push 与 Draft PR 尚未完成；不得 ready 或合并。
- 语义质量、主观体验和真实提供商计费未验收，继续保持 `not_assessed`。
- 未读取或迁移任何用户旧梦；本轮为全合成离线闭环。

# 候选评价读取与输出空间复查

结论：继续保留离线候选，不进入付费流程。新增一个派生读取接口，把缺少依据的评价显示成明确空值；保留旧原幕里的兼容数字。新增字节审计证明短脚本样例可以容纳，而字段各自合法不保证整体响应可容纳。它没有测量真实模型 token、费用、生成质量或心理状态。

后续用户提供的 Windows / Node.js v24.19.0 输出报告 127 项测试全部通过、0 失败/取消/跳过，字节审计的四条短样例、3112 字节超限拒绝和 1199/1200/1201 边界均与 Linux 结果一致。真实请求为 0，token 数仍未测量。此为用户报告而非独立检查其机器或精确 checkout 身份，汇总见 `docs/validation/user-local-appraisal-read-size.json`。这组离线兼容性验证已收尾，无须为同一结论反复运行。

## 读取：不把占位数字当成测量

`readAppraisalView(store, entryId)` 位于 `src/appraisal-view.js`，只接受已打开的本地 Store。它从受管理的原梦和同一运行重建视图，核对候选依据、幕间数值、来源引用及协议身份；不接受一个脱离梦簿的匿名对象直接充当现实证据。

| 原幕中的字段 | 依据 | 视图中的状态和值 |
| --- | --- | --- |
| control / uncertainty = 0.5 | 无摘录 | `not_stated / null` |
| control / uncertainty = 0.5 | 有逐字摘录 | `model_estimate / 0.5`，仍未核验语义 |
| goalEffect = 0 | 按 v1 合同无目标影响摘录 | `not_stated / null`，不能据此宣称目标确实毫无影响 |
| goalEffect = -1 / 1 | 目标与结果摘录 | `model_estimate / 原数值` |
| delta 两项为零 | 无情绪依据 | `not_stated / null`，不能称情绪被测为完全不变 |
| delta 数值 | 有情绪依据摘录 | `model_estimate / 原 delta` |

`appliedAffect` 另外保存实际用于模拟计算的 before/delta/after，以便解释“计算时做了什么”。它的 `origin:simulated_affect / isRealityFact:false` 与评价依据是否充分分开；计算没有移动与已证明没有情绪变化不是同一结论。

视图带 `origin:dream_appraisal_view / materialKind:fictional / isRealityFact:false`、父梦编号、来源引用和 `semanticSupport:not_assessed`。所有估计仍是模型声明，不因引用存在变成语义验证通过。旧协议返回 `unsupported_protocol`，不迁移或补写新证据；回想等子条目不能冒充原梦。

视图不写文件、不生成正文缓存、不调用模型、不改原幕、余韵、珍藏或日常召回策略。每次从 Store 重读；来源撤回或删除后返回空，不从历史视图恢复正文。已经交给调用者的副本与已复制终端输出一样无法主动收回，调用方如要存储也必须遵守来源撤回合同，不能声称本函数能清除外部副本。没有实现或宣称兼容尚不存在的 Asteria 接口。

示例（使用调用方已持有的 Store，不打开另一把写锁）：

```js
import { readAppraisalView } from './src/appraisal-view.js';
const view = readAppraisalView(engine.store, dreamId);
```

## 输出空间：字节与 token 分开

`scripts/audit-appraisal-output.mjs` 对独立编写的脚本化虚构数据进行 JSON 序列化，并调用现有响应解析器进行字节准入检查。它不读取密钥、不发 HTTP、不写梦簿。报告中的模拟 usage 仅为了走解析路径，不是实际 token 测量；`actualModelTokenCount:null`。

| 预先脚本样例 | 不含 basis 的 JSON 字节 | 含 basis 的 JSON 字节 | 新增字节 |
| --- | ---: | ---: | ---: |
| ordinary-no-goal | 164 | 255 | 91 |
| stated-goal-hindered | 246 | 509 | 263 |
| stated-goal-helped | 230 | 492 | 262 |
| affect-without-goal | 218 | 353 | 135 |

上述数字是 UTF-8 JSON 字节，包括字段名和引号，**不是 token**。四条短样例均通过现有 1200 字节响应正文限制；这不能证明它们在真实服务商 tokenizer 下均少于 400 tokens。实际接口的输出 token 上限仍为 400，二者同时适用，不混为兑换公式。

另一个纯边界探针将五处摘录各取 160 个汉字，单字段与结构均合法，整体达到 **3112 字节**，被现有解析器拒绝。1199/1200 字节的合成 JSON 通过字节门，1201 字节拒绝；边界 JSON 不是可发布的梦境，也没有据此接受语义。字节门可能保守拒绝实际 token 数尚未到上限的内容；程序不据此自动放宽、裁字、改写、增加预算或修复调用。

## 技术裁决与下一步

1. 原始候选协议及已保存梦保留兼容数字，读取时用上述版本化视图区分未知与估计；这是新增投影，不是把旧 wire/store 合同静默改成可空。
2. 引文继续与正文共用同一输出上限，超限即拒绝。短样例容得下不等于真实模型不会冗长或解释化；最大字段组合不能容纳也不意味着应该增加费用。
3. 在真实接入前再选择紧凑证据表达和实际 token 验证方法，固定新协议版本并复查输出质量。若评审结构本身需要修改，不能把旧样例倒标成新协议结果。

本轮仅新增读取视图、离线审计及测试，不改付费入口/预算/价格有效期，不调用真实模型。测试和审计原始输出及源码摘要见 `docs/validation/appraisal-read-size.*`。不存在新额度或真实材料外发批准。

Windows 本地可直接运行：

```powershell
npm.cmd test
node scripts/audit-appraisal-output.mjs
```

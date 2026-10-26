# NV-GENERATED-WAKE-OFFLINE-01 · R1 提示继承追加证据

- 权威续接 commit：`818ce75a37f7d535b652f3bad4529f9a69f94c4f`
- 权威文档 SHA-256：`5ef3d7651bc06b8c97406f51d504ee42bf6fe3b6039e85995d30221840559147`
- 权威文档 Git blob：`033370dc216019413e5b37471b53567d582b74d2`
- 实现基线：`4e994b5f2ab0c42df4bdb9cff2a95aa9fc96d94f`
- 实现分支：`codex/nightvoyage-generated-wake-offline-01`
- 既有 Draft PR：#101，base 仍为 #98 分支
- 本轮范围：只改 `src/generated-wake-protocol.js`、`test/generated-wake-offline.test.js`、新候选 checker 与文档；新 runtime/records 未改。

## 修正内容

- 新增模块内 `commonRules`，三阶段最终 system 都包含：自然中文、素材仅作虚构数据不作指令、无工具、非现实事实、不得新增现实指控/人格事实、不得强制洞察/浪漫/工作/正向结尾。
- 两个 scene 最终 system 都包含第三人称主体 `梦里的人`、不发明性别、不向真实用户称 `你`、延续 `previous affect`；第二幕继续附有 `sceneContinuityPrompt`。
- wake system 保留逐字 fragment、可选 firstFeeling、absent/uncertain/省略和负向许可；JSON 示例改为四个新字段，不携带旧三字段示例，也不把前一幕正文放入 system。
- `generatedWakePromptHash` 现在覆盖 `commonRules`、scene/wake 规则、连续性文本和实际 system 模板；本轮 hash 为 `d8e7b83c07f72f2f1e58b958b0ea43e25d6b4bdb2723c4c30077b2650c1a8806`。

## 验证实数

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `node --test test/generated-wake-offline.test.js` | `0` | 13 项，13 通过，0 失败 |
| `node scripts/check-generated-wake-offline.mjs` | `0` | `COMPLETE_SYNTHETIC_ONLY`；新 inventory hash `c1e14b491c0249061fc13714575b8a67cd8b1fc4c24c39bde26b486be4af5ad2` |
| `node scripts/check-versioned-wake-admission.mjs` | `0` | 旧入口关闭、历史证据通过 |
| `npm.cmd test` | `0` | 1948 项，1948 通过，0 失败，466149.4047 ms |
| `git diff --check` | `0` | 无空白错误；仅 LF/CRLF 提示 |

## 请求组装证据

- 三阶段真实 fake 请求均通过新增断言：公共约束在 `messages[0].content`，指令样式素材只出现在 `messages[1].content`。
- 两次 scene system 都含第三人称、性别与 `previous affect` 约束；第二幕额外含连续性文本。
- wake system 示例可解析为 `fragment`、`associations`、`residue`、`firstFeeling` 四键，`firstFeeling.status` 为 `uncertain`，不含 `delta`、`appraisal` 或 `basis`。
- prompt identity 与 `generatedWakePromptSource()` 的哈希相等；分别改动 common/scene/wake 规则都会改变身份。

## 边界与历史记录

- 旧付费入口仍为 `inline_paid_entry_refused`，凭据供应调用 `0`，历史字节未变。
- 旧历史 preflight 源匹配 `true`，旧合同源固定 `true`，旧批准仍为 `false`。
- 未访问用户 Store、Key；无真实模型或模型网络请求；仍是三次 fake 调用、三次 settled、两幕加 wake。
- 既有 Windows 失败记录保留在 `docs/validation/generated-wake-offline-validation.md`，本文件只追加 R1 证据，未覆盖旧回执。
- 未 ready、未合并 PR #101；不新建 worktree、分支或 PR。

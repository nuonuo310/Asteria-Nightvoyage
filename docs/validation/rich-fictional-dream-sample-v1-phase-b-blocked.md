# NV-RICH-FICTIONAL-DREAM-SAMPLE-01 · Phase B R1 回执

日期：2026-10-28

状态：`BLOCKED`

权威包：`ee6ea7e48ff5eee8bf9260199250001a9109628c:docs/construction-envelopes/2026-10-27-rich-fictional-dream-sample-v1.md`，已读取并严格执行末尾 R1。

Worktree：`C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-RICH-FICTIONAL-DREAM-SAMPLE-01`

分支：`codex/nightvoyage-rich-fictional-dream-sample-01`

## 固定身份

| 项目 | 值 |
| --- | --- |
| Phase A HEAD | `c9c0438945bb35a1b507ca14166136c4292f73ec` |
| Phase A tree | `375bc898da910d2311903ed9a4a74df50f2d95a0` |
| Phase A parent | `621074a9a57772d957e43bed8d26ea7fae3a0561` |
| Phase A identityHash | `851e443a44bb044e8f2153dd791cc47ec653713b3bdc7339c5a0513cbc2c44ea` |
| Phase B identityHash | `3be74c80ff49d60a7b72b8057142db1abaeee44f2d838a6b4bc6a79fb4a89927` |
| R1 release hash | `3f14ffc735dcb62284424378b3596312976f14a7b6e36fb45b26e5886ae60969` |

Phase A 的 `runtime.mjs` 等十个执行文件保持原字节不变；Phase B 只在 `phase-b/` 新目录重钉九个执行文件。没有改写固定 source、prompt、3×4 结构、400-token 输出上限、16,384-byte 请求上限、0.48 元硬上限或无重试语义。

## 价格与预算

- 官方价格页本地证据 SHA-256：`556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3`。
- `deepseek-flash` 仍指向 `DeepSeek-V4.1-Flash-1017`；高峰缓存未命中输入 2 元/百万 tokens，输出 8 元/百万 tokens。
- 首个请求体 4,062 bytes；单次最坏预留 35,968 micro-CNY；12 次最坏 431,616 micro-CNY；硬上限 480,000 micro-CNY。
- 专用 Store `C:\Users\Administrator\AppData\Local\Nightvoyage\rich-fictional-dream-sample-01` 在停止时仍不存在。

## 无凭据准入

临时放置精确 R1 release 后执行：

`node scripts/nv-rich-fictional-dream-sample-01/phase-b/check-admission.mjs --price-file <saved-official-pricing-html>`

结果：`READY_FOR_ONE_LIVE_BATCH`，`ok=true`；sentinel supplier 调用 0，credential supplier 调用 0，网络尝试 0，真实模型请求 0，Store 不存在。随后立即撤销临时 release，未提交 `release.json`。

## 唯一入口尝试与阻断

既有私密一次性凭据机制在静态检查后请求了一次凭据。父环境未提供 `NIGHTVOYAGE_DEEPSEEK_KEY`，入口返回：

- `status=blocked`
- `reason=rich_sample_credential_source_unavailable`
- `credentialRequested=true`
- `phaseBReleaseRevoked=true`
- `storeExists=false`
- `networkAttempts=0`
- `realModelRequests=0`
- `phaseBExecuted=false`

没有改用明文、凭据存储探测或其它供应路径，也没有重试真实批次。

## 定向验证

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| Phase A/B 定向 | `node --test test/rich-fictional-dream-sample.test.js test/rich-fictional-dream-sample-phase-b.test.js` | 19 / 19 pass，0 fail |
| R1 release 精确匹配 | release object hash | `3f14ffc735dcb62284424378b3596312976f14a7b6e36fb45b26e5886ae60969` |
| Phase B identity | 九个执行文件 | `3be74c80ff49d60a7b72b8057142db1abaeee44f2d838a6b4bc6a79fb4a89927` |
| 真实 transport | 固定 `POST https://api.deepseek.com/chat/completions` | Node HTTPS，无重定向、代理、备用 host 或 fetch |

## 内容回执

本次没有真实批次，因此没有三场梦境、三幕原文、wake、firstFeeling、associations、residue、usage 或费用。未伪造任何梦境或逐场回执。

## 边界与停止

- 未读取 Key、凭据存储、余额或真实用户 Store。
- 未发起网络或真实模型请求，未产生费用。
- 未重试、替换结果、补第四场或生成后来回想。
- 未执行 Phase B，未 ready、未合并、未部署、未自动续开任务。
- 保持 PR #107 Draft，交回总控人工评审。

恢复条件：仅在同一 R1 下恢复既有私密一次性凭据供应机制后，允许执行唯一真实批次；不得自动重试本次阻断入口。

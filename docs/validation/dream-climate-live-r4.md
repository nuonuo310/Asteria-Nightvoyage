# NV-DREAM-CLIMATE-LIVE-R4 离线准备回执

Status: `READY_FOR_TOTAL_CONTROL_REVIEW_R4`

本回执只证明离线实现、价格证据核对、dummy 排练与定向验证。没有读取 Key 或任何凭据，没有请求真实模型或网络，没有打开旧真实 Store，没有产生费用、重试、ready、合并、部署或新任务。本轮终点是总控审阅，不是用户可执行的 real run。

## 固定输入

- 仓库：`nuonuo310/Asteria-Nightvoyage`
- worktree：`C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01`
- 分支：`codex/nightvoyage-dream-climate-offline-01`
- Draft PR：#109，stacked 到 `codex/nightvoyage-rich-fictional-dream-sample-01`
- 实现起点 HEAD：`de14f237d26b7ee82d5be7196162d661a6291b28`
- 起点 tree：`5435202edc9ca444385609d867294d75a882e1e2`
- 起点 parent：`9c2137304471ab554cb95d52374e10521e2f4272`
- 权威提交：`6316e99ad51d1ba2a282406b6667e24e2444f77f`
- 权威文件 blob：`a9f88b1e2ded981df66eeab472c5f8cd0579e883`

施工前逐字读取了权威包全文、适用 AGENTS.md 与本仓库既有协议/验证回执。本 worktree 及其上级没有适用的 AGENTS.md；桌面其他目录的 read-input 副本不属于本仓库范围。确认没有同包 node 进程在运行后才开始施工。

本包只新增 `scripts/nv-dream-climate-offline-01/single-run-r4/`、R4 测试、验证回执，以及允许的 phase-b 内部 profile 重构。五个离线执行文件、共享 `src/`、source、prompt、fixtures、matrix 规则、旧价格、旧身份文档与旧账均未修改。

## 固定范围

- 一次新 run：`nv-dream-climate-one-dream-r4-a`
- allowance：`nv-dream-climate-one-dream-r4-001`
- 专用目录：`C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r4-01`
- 三幕 scene + 一次 wake，最多 4 calls，每次 `max_tokens=400`，请求体上限 16384 UTF-8 bytes
- 固定 `ordinary / transformation / cup_tap`，两个 used ledger 均为空
- 单 call 保留 35968 micro-CNY，四次最坏 143872，硬上限 160000 micro-CNY（0.16 元）
- 首个请求实测 4855 bytes，小于上限

R4 使用独立的 Store 状态键（`dreamClimateR4Batch`、`dreamClimateR4Journal`、`dreamClimateR4Billing`、`dreamClimateR4Version`）与独立记录前缀（`r4-dream-*`、`r4-wake-*`、`r4-residue-*`、`r4-feeling-*`）。旧 R3 Store、旧三幕、unknown 账务与 B/C queued 状态未读取、未迁移、未改写。

## 身份

- offline identityHash（冻结，未变）：`f88fccb0349b0004db6c81deb0261f3d620f06480ab24b4a9c3aee2f94cfae28`
- promptHash（未变）：`9c855d8b3e3b2a55c3f58e36de4a9aee5dec07b706cbf675912632d6ff8dd119`
- sourceHash（未变）：`605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6`
- R4 execution identityHash：`bf509d3d9d4a230c6ccc74709539549161da9fe0c5d7e31762bf31fb74165b28`
- R4 release hash：`de4c1c85dd4bea5831b7ead3cc7fa9bb728326ac4846640fe56afb6bcdbb1a5f`
- R4 matrix hash：`b9d123b99fb241423e63bf79d5cc2ed1a761a6bd4c9741425d0918950ab13fde`
- R4 price snapshot hash：`fd3016c7cc74a0eeac704bff94295dd1db3fd86a2bdee5ec464ef91d1c23b796`

R4 identity 覆盖 15 个 R4 包文件（含 `secure-input.ps1`）与 10 个共享 phase-b 文件，并固定 profile、matrix、价格快照、四次/0.16 元上限、专用目录、identity 与无重试规则。`secure-input.ps1` 内写字面 release 与本包 `r4ReleaseObject()` 的 hash 完全一致（由测试逐字解析 block 后比较）。

R3 的执行 identity 因本包明确允许的 phase-b 复用重构（`profile.mjs` 与按 profile 参数化）变为 `85a808c61c693024e23d42e79ef14f129117709f4a5117732374b01ac03333a4`。已经发生的 R3 真实批次仍由历史身份 `aff0b17e450c561908589a68ae2306be7a694c4faf9b044782286ea50a36e3f1` 命名；本包没有改写 R3 验证文档、R3 Store 记录或旧账，也没有用新值覆盖历史叙述。R4 不读取旧真实 Store。

## 价格核实（已核实，非 PRICE_REVIEW_PENDING）

- 官方价格页：`https://api-docs.deepseek.com/zh-cn/quick_start/pricing/`
- 已保存官方 HTML：`C:\Users\Administrator\Desktop\deepseek-pricing-r1.html`
- 字节数：26182
- SHA-256：`556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3`
- 文件 mtime（UTC）：`2026-10-28T15:11:38Z`
- 复核时间（本地 Asia/Shanghai）：`2026-10-29T01:56:49+08:00`
- 快照内既有 reviewedAt（未改写）：`2026-10-28T15:22:24Z`

只读核对确认页面同时包含 `deepseek-flash`、模型版本 `DeepSeek-V4.1-Flash-1017`、百万 tokens 输入高峰时段 2 元与输出高峰时段 8 元。价格与模型一致，因此本轮记录来源、时间与 SHA，状态为 `READY_FOR_TOTAL_CONTROL_REVIEW_R4`；预算参数保持原已审查值，未自行加预算。

## R4 行为

- 只新增精确绑定 R4 的入口。旧的 phase-b launcher、secure-console、worker 与 `secure-input.ps1` 继续返回 `OFFLINE_REVIEW_REQUIRED_R3`；旧 release 无法打开 R4，R4 release 也无法打开旧入口。
- `secure-input.ps1` 的顺序是：release 不存在、专用目录不存在、admission 通过 → 写入一次性 release → 启动 worker → 读到 worker 的 `credential_required` 且 hash 与 admission 一致 → 才唯一一次 `Read-Host -AsSecureString`。worker 自身在提示前还会重新检查 release、identity、价格与 Store 不存在。
- 凭据只经现有的一次性 stdin 管道供应，不读环境变量、凭据库、剪贴板、命令行明文或文件 Key，不持久化；BSTR、明文字符串与 frame 字节在使用后清零，异常路径在 `finally` 中撤销 release 并结束子进程。
- 一次触发结束即撤销 release；不重试、不增补、不替换 run，也没有第五次调用或第二个 run。
- transport 在序列化原文（含 JSON 转义形式）与解析后的模型 content 中检查凭据回显，新增 `\uXXXX` 全转义形式检测；拒绝回显时不返回 body，因此不会把内容持久化为诊断。
- 已验证 provider usage 的结算与梦内容发布彼此独立：有效 usage 先经 `BudgetLedger.settle` 结算一次，再规范化与原子发布；失败时三幕 draft 原文完整保留，正式梦、wake、firstFeeling、residue 均记为未发布/未记录。
- 账务继续分开 settled 计算额、unknown 占用与合计，并明确合计不是 provider 已确认实扣；调用数与 ledger 行一致。
- 凭据前错误计为精确 0/0 且 `requestOutcomeKnown=true`；dispatch 后按实际网络/模型请求计数；子进程在交付凭据后崩溃时父进程回执为 `null / null / false`（unknown），不退回硬编码零。
- receipt 分开原梦、逐字 fragment、四态 firstFeeling、simulated residue 与为空的后来回想；技术模型名只出现在审计字段。

## 验证实数

- `node --test test/dream-climate-live-r4.test.js`：30 pass / 0 fail，exit 0。
- `node --test test/dream-climate-live-r1.test.js test/dream-climate-live-r2.test.js test/dream-climate-live-r3.test.js`：35 pass / 0 fail，exit 0。
- `node --test test/dream-climate-offline.test.js`：11 pass / 0 fail，exit 0。
- 51 项最小回归（`rich-fictional-dream-sample`、`generated-wake-offline`、`generated-wake-story`、`fictional-source-probe`、`wake-first-feeling`、`versioned-wake-admission`）：51 pass / 0 fail，exit 0。
- `node scripts/check-generated-wake-offline.mjs`：exit 0；key reads 0、network 0、real model 0、user Store accessed false、`inline_paid_entry_refused`。
- `node scripts/check-versioned-wake-admission.mjs`：exit 0；credential reads 0、network 0、real model 0、user Store accessed false。
- `git diff --check`：exit 0。

R4 专项覆盖：成功恰好四次并原子发布三幕加 wake；present/absent/uncertain/omitted 四态各自合法；wake 无效时精确子原因、三份完整 draft、有效 usage 已结算、无正式梦/余韵/firstFeeling、无重试；缺失或非法 usage、请求失败、结算后诊断写入失败、发布失败继续 R3 账务语义；第五次、第二场、同 run 重启、目录已存在、旧 release、identity 漂移均拒绝；admission supplier 0 且 dummy 不访问真实目录；凭据前精确零、dispatch 后实际数、子进程崩溃 unknown；原文与 Unicode 转义凭据回显都不进入 Store 或回执；`secure-input.ps1` 内 release block 与其 hash 逐字相等。

首次 R4 专项运行失败于测试文件自身：先是错误的 `r4ExpectedReleaseHash` 导入路径导致模块加载失败；修正后 27 pass / 3 fail，原因是两处把 `provider_or_validation_failure` 误期望为 `uncertain`，以及一个人工流对象在 30 秒后触发 `input.off` 的异步泄漏。修正为真实失败分类并使用真实 `PassThrough` 后，R4 文件 30/30。生产代码没有因这些失败被放宽。

## Admission 与 dummy

`node scripts/nv-dream-climate-offline-01/single-run-r4/check-admission.mjs --price-file C:\Users\Administrator\Desktop\deepseek-pricing-r1.html` 输出 `R4_OFFLINE_ADMISSION_PASSED`：

- release 不存在、专用 Store 不存在、`secureInputReady=false`
- dummy：`R4_DUMMY_REHEARSAL_PASSED`，1 个 completed run、4 calls、4 dispatches
- 第五次调用、第二场、同 run 重启、目录已存在均被拒绝；owner.lock 观察到并清除；临时 Store 删除
- `credentialSupplierCalls=0`、`credentialRead=false`、`networkAttempts=0`、`realModelRequests=0`、`realStoreCreated=false`

## 唯一新 secure-input 命令（本轮未运行）

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File 'C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01\scripts\nv-dream-climate-offline-01\single-run-r4\secure-input.ps1' -PriceFile 'C:\Users\Administrator\Desktop\deepseek-pricing-r1.html'
```

该命令只能在总控审阅通过并交付给用户后由用户主动运行。本轮施工端没有运行它，也没有输入、提示或读取 Key。

## 边界

- 未读取 Key、凭据存储、环境变量凭据、剪贴板、余额或任何真实 `state.json`。
- 未请求真实模型或网络，未产生费用、重试、replacement run、第五次调用或第四个 run。
- 未创建、打开或迁移旧真实 Store；旧梦、旧账、B/C queued 与历史 R3 身份保持不变。
- 未修改 prompt、source、fixture、matrix 规则、价格、预算、共享 `src/`、五个离线执行文件或旧验证文档。
- 未 ready、合并、部署或开启下一包。
- 本环境没有 `gh` CLI，且未读取任何凭据；PR #109 描述未由本轮回写，历史证据链接保持原样。提交与普通 push 到同一分支后，PR 仍为 Draft。

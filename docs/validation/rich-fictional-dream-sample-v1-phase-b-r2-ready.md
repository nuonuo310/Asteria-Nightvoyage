# NV-RICH-FICTIONAL-DREAM-SAMPLE-01 · Phase B R2 回执

日期：2026-10-28

状态：`READY_FOR_USER_SECURE_INPUT`

权威包：`fdbdfdda2732a7f2bebb12b46b039e067c498199:docs/construction-envelopes/2026-10-27-rich-fictional-dream-sample-v1.md`，已读取并严格执行末尾 R2。

固定候选：HEAD `f27db88b15426a7c32911aa3f4cf6016cd3527e9`，tree `1939d96805523bc2f3ff20491868652bb65f267d`。

## R2 修正

| 项目 | 结果 |
| --- | --- |
| 环境变量凭据 fallback | 已删除 |
| 核心 `run` 缺失显式 supplier | 在 worker/Store/网络前返回 `rich_sample_credential_source_unavailable` |
| Node 安全适配器 | `secure-console.mjs`，只读 stdin，延迟到匹配握手后读取一帧 |
| PowerShell 隐藏输入 | `secure-input.ps1`，准入通过后仅调用一次 `Read-Host -AsSecureString` |
| BSTR | `SecureStringToBSTR` / `ZeroFreeBSTR`，发送后立即清零 |
| credential frame | 仅写 Node stdin，上限 8,192 bytes，不进入 argv、环境、文件或输出 |
| 准入失败 | 不提示 Key，并撤销临时 release |
| Phase B identity | `a24b55a430b9a663c8bb95bcbed0f97e079f524fa326d98158045ff40b0a2e5c`，覆盖 11 个执行文件（含 `.ps1`） |

Phase A 十个执行文件、固定 source/prompt、3×4 结构、400 tokens、16,384 bytes、480,000 micro-CNY、串行顺序、无重试/替代/第四场及 later recollection 为空均未修改；未改 `runtime.mjs`、`records.mjs` 或 `transport.mjs` 语义。

## 准入与测试

- 价格页证据 SHA-256：`556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3`。
- sentinel 准入：`READY_FOR_ONE_LIVE_BATCH`，`ok=true`；credential supplier 0、sentinel 0、网络 0、真实模型 0、Store 不存在。
- 定向测试：`node --test test/rich-fictional-dream-sample.test.js test/rich-fictional-dream-sample-phase-b.test.js`，22 / 22 pass，0 fail。
- 仅使用 dummy frame；未读取真实 Key，未运行真实模型，未创建真实 Store。
- 临时 release 已在准入后撤销；`release.json` 未提交。

## 唯一启动命令

请在普通 PowerShell 中亲自运行下面这一条命令；只在脚本显示的隐藏提示中粘贴 Key：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-RICH-FICTIONAL-DREAM-SAMPLE-01\scripts\nv-rich-fictional-dream-sample-01\phase-b\secure-input.ps1" -PriceFile "C:\Users\Administrator\AppData\Local\Temp\deepseek-pricing-20261028.html"
```

脚本只允许一次启动；若准入失败则不提示输入。启动后若任一请求进入 unknown/timeout/cancelled 或某 run 未 completed，必须停止余下场次且不得重试。完成后保持 PR #107 Draft，不 ready、不合并、不部署。

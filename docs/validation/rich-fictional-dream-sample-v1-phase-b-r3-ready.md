# NV-RICH-FICTIONAL-DREAM-SAMPLE-01 · Phase B R3 回执

日期：2026-10-28

状态：`READY_FOR_USER_SECURE_INPUT_R3`

权威包：`935c33bcf51c31fa5941ec36babadd7364947cdb:docs/construction-envelopes/2026-10-27-rich-fictional-dream-sample-v1.md`，已读取并严格执行末尾 R3。

固定候选：HEAD `5c704cd2871ddbdd7685ef5e5872b2688c96e945`，tree `0f48fb8b1bd5a9806bee7fb691addcc310d93e38`。

## R3 修正

| 项目 | 结果 |
| --- | --- |
| Phase B 专用 Store | `C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-rich-dream-sample-01` |
| 固定 basename | `nightvoyage-rich-dream-sample-01` |
| 冻结 runtime dedicated prefix | `nightvoyage-rich-dream-sample-` |
| R1 release hash | `b60cd22b14ced7409e07742600b06a544acddff4f79430419b01404a605b9f26` |
| Phase B identity | `03bac475b3490f40d4e013aa4fdd21242d5d8e9bc86eba955bdd6f6f3c4d6494`，覆盖 11 个执行文件 |
| 旧富梦 Store | 未读取、未修改、未删除 |

Phase A 的 HEAD、tree、identity、十个执行文件及 `runtime.mjs` 均未修改。固定 source、prompt、transport、records、价格、3×4 结构、400 tokens、16,384 bytes、480,000 micro-CNY、串行顺序、无重试/替代/第四场及 later recollection 为空均保持不变。

## Store 契约证明

- 准入先核对完整固定路径、basename 和冻结 runtime 的精确 dedicated prefix。
- 使用既有 frozen `RichDreamSampleRuntime` 与 dummy simulator，在临时父目录实际构造同 basename Store。
- 已观察到 `owner.lock` 创建；正常 `close()` 后确认锁移除。
- 临时 Store 与其临时父目录均已递归删除，并验证不存在。
- dummy simulator 调用 0，网络尝试 0；真实专用 Store 仍不存在。
- 以上证明位于 credential prompt 之前。任一失败不会启动 secure console 或提示 Key。

## 准入与测试

- 无凭据 sentinel 准入：`READY_FOR_ONE_LIVE_BATCH`，`ok=true`；credential supplier 0、sentinel 0、网络 0、真实模型 0、费用 0。
- 定向测试：`node --test test/rich-fictional-dream-sample.test.js test/rich-fictional-dream-sample-phase-b.test.js`，23 / 23 pass，0 fail。
- 仅使用 dummy frame；未读取真实 Key，未运行真实模型，未创建真实 Store。
- 临时 release 已在准入后撤销；`release.json` 未提交。
- 价格窗口保持至 `2026-10-28T00:00:00Z`，未延长或刷新。

## 唯一启动命令

请在普通 PowerShell 中亲自运行下面这一条命令；只在脚本显示的隐藏提示中粘贴 Key：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-RICH-FICTIONAL-DREAM-SAMPLE-01\scripts\nv-rich-fictional-dream-sample-01\phase-b\secure-input.ps1" -PriceFile "C:\Users\Administrator\AppData\Local\Temp\deepseek-pricing-20261028.html"
```

脚本只允许一次启动；准入失败则不提示输入。启动后若任一请求进入 unknown/timeout/cancelled，或某 run 未 completed，必须停止余下场次且不得重试。完成后保持 PR #107 Draft，不 ready、不合并、不部署、不生成后来回想、不自动续开任务。

# NV-DREAM-CLIMATE-LIVE-R1 Phase B validation

状态：`READY_FOR_USER_SECURE_INPUT_R1`

本回执只证明离线准入、dummy 排练、identity 和 secure-input 已准备完成。没有读取 Key、没有运行真实模型、没有创建真实 Store、没有产生费用，也没有 ready、合并或部署。

## 固定身份

- offline candidate：`119a6ba909cfaa75b29bd3d4c4fcf9500996e2bd`
- offline tree：`ab4171b8f18fe49060d4f649c4b1672d09200abe`
- offline parent：`7ec24e6d90c45af67fe251fc65f21c4d257bf476`
- offline identityHash：`f88fccb0349b0004db6c81deb0261f3d620f06480ab24b4a9c3aee2f94cfae28`
- live identityHash：`42fda7ae6b3667c46c3f6b38cc2e16bdf3823fa840759a6e50d558904f633828`
- matrixHash：`05247698e2b4e13989f40edb4c25ce8ad21a901a162ea1c9f7556e69dfcce7eb`
- releaseHash：`ee7ab9fbb6f71b582b442d27000d17f153dbfff1ac378ae4691cbfc869401bae`
- priceSnapshotHash：`247b8a83415ea54b05b43e2162d74ceef093824f6d2aba1b478028890cc85522`
- official price page SHA-256：`556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3`

新增 live 执行文件 18 个；冻结离线执行文件 5 个，blob 与 R1 权威表一致。

## 固定矩阵

| run | climate | mechanism | foregroundAnchor | usedForegroundAnchors | usedMechanisms |
| --- | --- | --- | --- | --- | --- |
| A | `ordinary` | `transformation` | `cup_tap` | `[]` | `[]` |
| B | `uneasy` | `spatial_dislocation` | `rain_street` | `[cup_tap]` | `[transformation]` |
| C | `nightmare` | `temporal_recurrence` | `ticket_date` | `[cup_tap,rain_street]` | `[transformation,spatial_dislocation]` |

专用 Store：`C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-live-01`。准入验证 parent、basename、dedicated prefix 和真实路径；admission 时该路径不存在，运行后不得自动创建第二批次。

## 请求与预算

- dummy 的 12 个请求体：4,855 至 7,153 UTF-8 bytes。
- 单次上限：16,384 bytes。
- `max_tokens=400`，3 runs × 4 calls，共 12 calls。
- 单 call 最坏预留：35,968 micro-CNY。
- 最坏总计：431,616 micro-CNY。
- 硬上限：480,000 micro-CNY；第 13 call 失败关闭。

## Dummy 排练

- 3/3 runs 完成，12/12 calls settled。
- 每场 3 scene + 1 wake，第四次调用后才原子发布整场 dream/wake。
- 每场 4 笔账务按 runId 隔离，跨 run 不串 scenes/ledger。
- owner.lock 已观察创建并在关闭后清除；临时同 basename Store 已删除。
- 第 13 call、第四场和重跑均失败关闭。
- 取消后的晚到响应未发布任何 dream/wake，账务保持 unknown。
- 三场 firstFeeling 为 `present`、`absent`、`omitted`，没有 uncertain 单一样例锚定，也没有由 climate 映射。
- 后来回想为空。
- credentialReads=0；networkAttempts=0；realModelRequests=0；realUserStoreAccessed=false；realStoreCreated=false；paidCalls=0；costMicroCny=0。

## 测试

- `node --test test/dream-climate-live-r1.test.js`：10 pass / 0 fail，exit 0。
- `node --test test/dream-climate-offline.test.js`：11 pass / 0 fail，exit 0。
- `node --test test/rich-fictional-dream-sample.test.js test/generated-wake-offline.test.js test/generated-wake-story.test.js test/fictional-source-probe.test.js test/wake-first-feeling.test.js test/versioned-wake-admission.test.js`：51 pass / 0 fail，exit 0。
- `node scripts/check-generated-wake-offline.mjs`：exit 0，`inline_paid_entry_refused`，credential supplier / key reads / network / real model 均为 0。
- `node scripts/check-versioned-wake-admission.mjs`：exit 0，旧历史保持隔离，credential reads / network / real model 均为 0。
- `node scripts/nv-dream-climate-offline-01/phase-b/check-admission.mjs --price-file <official pricing HTML>`：`READY_FOR_USER_SECURE_INPUT_R1`，dummy 通过，sentinel supplier 0，network 0，real Store 0。
- `git diff --check`：exit 0。

## 唯一 secure-input 命令

只有用户在普通 PowerShell 中主动运行以下命令，才允许一次真实批次。施工端没有运行它，也没有输入 Key。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01\scripts\nv-dream-climate-offline-01\phase-b\secure-input.ps1 -PriceFile C:\Users\Administrator\Desktop\deepseek-pricing-r1.html
```

secure-input 先完成全部无凭据准入，再显示一次 Key 提示；Key 只写入子进程 stdin 的单帧，随后从 SecureString/BSTR 和字节缓冲区清除。它不读取环境变量、系统凭据、剪贴板、文件 Key 或余额，不打印、不持久化、不继承 Key。临时 release 在 finally 中撤销，Store 关闭并确认 owner.lock 清除。

## 边界

- 不修改共享 `src/`、#107 真实梦、账务、旧 release 或旧 Phase B identity。
- 不接入 Memory/Mind、后来回想、页面美化、ready、合并或部署。
- 不授权第四场、重试、修复调用或额外评分模型。
- 真实批次完成后仍需总控人工内容评审；测试通过不等于内容通过。

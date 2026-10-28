# NV-DREAM-CLIMATE-OFFLINE-01 · R6 离线验证

状态：`READY_FOR_TOTAL_CONTROL_REVIEW_R6`

本轮只完成离线实现、dummy 排练、价格证据核对和定向验证。没有读取或提示 Key，没有调用真实模型，没有创建 R6 真实 Store，没有费用、重试、ready、合并或部署。

## 固定点

| 项目 | 值 |
| --- | --- |
| 仓库 | `nuonuo310/Asteria-Nightvoyage` |
| worktree | `C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01` |
| branch | `codex/nightvoyage-dream-climate-offline-01` |
| Draft PR | `#109` |
| fixed implementation HEAD | `c4680ad1065c7b8c8c4cbf57ba90d24d04d175b6` |
| fixed implementation tree | `b178f3ff6772842af210e3bac71206bbc5e13bb0` |
| fixed implementation parent | `48be3aad209db57cf125e69e84b1276cc3177efb` |
| authority commit | `1562240ca3c6967a2f3f50bb3788223b0ea73c5e` |
| authority file blob | `405e56be958be679408b1b8222784d1b0305caaf` |

权威包已从上述提交按 blob 逐字恢复到工作树；本地 blob 与提交内 blob 相同。

## R6 候选

- profile：`r6`
- run：`nv-dream-climate-one-dream-r6-a`
- allowance：`nv-dream-climate-one-dream-r6-001`
- Store：`C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r6-01`
- matrix：一场，`ordinary / transformation / cup_tap`，两个 used ledger 均为空
- 结构：3 幕 scene + 1 次 wake，最多 4 calls
- 请求：`max_tokens=400`、请求体上限 16,384 UTF-8 bytes；首请求实测 4,855 bytes
- 每次预留：35,968 micro-CNY；四次最坏 143,872 micro-CNY；硬上限 160,000 micro-CNY（0.16 CNY）
- 无重试、无第二场、无第五次调用

候选身份：

| 项目 | 值 |
| --- | --- |
| offline identityHash | `47767f6f733dc657dfef815839b7e9cf3218cff3d4844711a7a3d32c4488dedd` |
| offline promptHash | `9fe4d0863983eae2eb8a969d89fd6ffc5eeab3ebec507bf263d0f27664fbdb66` |
| offline sourceHash | `605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6` |
| matrixHash | `13c248a72b30266730997ee990838ec15ebaee48efd201c771bfc480bd1c52c9` |
| priceSnapshotHash | `fd3016c7cc74a0eeac704bff94295dd1db3fd86a2bdee5ec464ef91d1c23b796` |
| executionDigest / pin | `7bc93bb245fd9ed528b1fd00bf30ad1e03617f9f7b5a71718310af83ef1e88fd` |
| identityHash | `f6df1c3f2334cf0aa84bb818375e9e2129dadd155f7e0be1cc06ec5e066b2d6d` |
| releaseHash | `fbc473149d39fe917cbff0f47a851e5fce95c8baab78cf867f67b21e61998daa` |

execution digest 覆盖 19 个 R6 执行文件、10 个复用的 Phase B 文件、固定 contract 和价格摘要；执行 pin 文件自身不进入摘要，避免自引用。代码、manifest 与 pin 同步漂移仍不能通过旧批准。

## 价格证据

权威页面：`https://api-docs.deepseek.com/zh-cn/quick_start/pricing/`

| 项目 | 值 |
| --- | --- |
| 保存证据 | `C:\Users\Administrator\Desktop\deepseek-pricing-r1.html` |
| 字节数 | 26,182 |
| SHA-256 | `556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3` |
| reviewedAt | 2026-10-28T15:22:24.000Z |
| saved file mtime | 2026-10-28T15:11:38.3085416Z |
| model alias | `deepseek-flash` |
| observed model | `DeepSeek-V4.1-Flash-1017` |
| 高峰缓存未命中输入 | 2 CNY / 1M tokens |
| 高峰输出 | 8 CNY / 1M tokens |

本轮仅只读核对保存的官方页面证据，没有联网刷新。页面 SHA 与已审查快照完全一致，模型和价格文本均匹配，因此按已核实证据记录；未自行增加预算。

## 实现与回执

- 新增 `scripts/nv-dream-climate-offline-01/single-run-r6/` 薄适配器，复用 Phase B runtime、records、diagnostics、transport、ledger 与 R5 normalization。
- prompt、source、fixtures、情绪规则、scene/affect、firstFeeling 四态、逐字 fragment、独立 residue 和矩阵语义保持冻结。
- `secure-input.ps1` 在 Key 输入前依次完成 admission、价格/身份/目录检查、临时 release 和 worker 静态预检；只提示一次 `Read-Host -AsSecureString`，不读取环境、剪贴板、Key 文件或凭据库。
- 临时 release 在成功和错误路径撤销；写入 release 前即标记为需撤销，写入中途失败也不会遗留。
- worker 的 stdout/stderr 使用严格 UTF-8 捕获；成功与失败均写专用 `receipt.json`，采用 `wx` 创建、禁止覆盖，内容不含 Key、headers 或完整 Store。
- 成功后原子发布完整梦；失败保留三幕 draft、具体 wake 子原因和已结算 usage，不发布半套记录。
- 已验证 usage 的 settled 与内容发布分开；usage 缺失、非法或传输失败保持 unknown 占用，不补造费用。
- R3、R4、R5 的旧入口继续关闭，旧 release 无法授权 R6，R6 release 也不能反向打开旧入口。

## 验证

| 命令 | 结果 |
| --- | --- |
| `node --test test/dream-climate-live-r6.test.js` | 20/20 pass，exit 0 |
| `node --test test/dream-climate-offline.test.js test/dream-climate-live-r1.test.js test/dream-climate-live-r2.test.js test/dream-climate-live-r3.test.js test/dream-climate-live-r4.test.js test/dream-climate-live-r5.test.js test/rich-fictional-dream-sample-phase-b.test.js` | 91/91 pass，exit 0 |
| `node scripts/nv-dream-climate-offline-01/single-run-r6/check-admission.mjs --price-file C:\Users\Administrator\Desktop\deepseek-pricing-r1.html` | PASS，dummy 4 calls，真实网络/模型/Store 均为 0 |
| `secure-input.ps1 -PriceFile <missing>` | exit 1，`required_file_missing`；无 release、无 Store、无 Key 提示 |

R6 专项首次运行有 8 个测试失败，均为测试对 receipt 形状的错误假设；核对时同时发现并修正了 `writeR6Receipt` 未传 `now` 时把时间戳当作函数的默认参数缺陷，以及 worker 成功返回值缺少 `credentialDelivered` 的问题。修正后专项 20/20 通过。

实际 Windows PowerShell + Node stub 已覆盖：

- `ok`：中文、JSON 引号、反斜杠、`\n`、`\r\n`、非 BMP 字符逐字一致；共 26 个 Unicode code points。
- `empty`：child exit 0 且无结果时为确定的空 stdout。
- `error`：child 非零退出时 stdout/stderr 分开保留。
- `garbage`：非法 UTF-8 被严格解码拒绝为 `stdout_invalid_utf8`，不会误读。
- `receipt.json` 无 BOM、严格 UTF-8 可解析；第二次写同一路径被拒绝且原文件哈希不变。

## 零真实调用证明

- credential supplier calls：0；本会话未运行 `secure-input.ps1`。
- 真实网络请求：0；所有 worker/runtime 测试使用 dummy simulator 或 fake request implementation。
- 真实模型请求：0；无真实费用。
- R6 真实 Store：测试前后均不存在。
- R6 release：测试前后均不存在。
- 旧真实 Store、旧梦和旧账未被读取、修改、迁移或重保存。
- 无自动重试、替代 run、第二场、第五次调用、后来回想、Memory/Mind 接入、ready、合并或部署。

## 停止点

到达 `READY_FOR_TOTAL_CONTROL_REVIEW_R6` 后停止。只有总控复核后才可决定是否向用户交付一次新的 secure-input 命令；本轮不执行、不提示输入 Key。

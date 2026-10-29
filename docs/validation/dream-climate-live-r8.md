# NV-DREAM-CLIMATE-OFFLINE-01 · R8 单场验证准备

状态：`READY_FOR_TOTAL_CONTROL_REVIEW_R8`

本轮只做离线接线、公开价格核对和有限离线验证。没有读取真实 Store 或 Key，没有提示用户输入凭据，没有请求模型生成接口，没有创建真实 Store、可执行 release、ready、合并或部署，也没有新建 worktree、分支或 PR。

## 固定点

| 项目 | 值 |
| --- | --- |
| 权威提交 | `e30d49f19819787623829a239abafbf521ab8e4e` |
| 权威文件 blob | `243fdf153b63cb16df3fd7501c2cdb966a330f6b` |
| 实现起点 | `a99341ea31f25fa67df968e46f8eb45159f0fa75` |
| 起点 tree | `2c3f5a172433b6b3ef1e3eadbb08d80e339a05df` |
| 起点 parent | `5885ebf8f7a73f53fd471e1680d21b9f6a457945` |
| worktree | `C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01` |
| branch | `codex/nightvoyage-dream-climate-offline-01` |
| Draft PR | `#109`，base `codex/nightvoyage-rich-fictional-dream-sample-01` |

R8 全文从权威提交同步到工作树，`git hash-object` 与提交内 blob 相同。R7 的 prompt/source/offline identity 保持冻结；R8 只新增独立接线和新身份。

## 固定运行配置

| 项目 | 值 |
| --- | --- |
| profile | `r8` |
| runId | `nv-dream-climate-one-dream-r8-a` |
| allowanceId | `nv-dream-climate-one-dream-r8-001` |
| Store | `C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r8-01` |
| matrix | `ordinary / transformation / cup_tap`，两个 used ledger 为空 |
| 调用 | 1 场，3 scene + 1 wake，最多 4 calls，无重试、无替代场、无第二场 |
| 请求上限 | 16384 UTF-8 bytes；max_tokens=400 |
| 预算 | 35968 micro-CNY/次；143872/四次；硬上限 160000 |
| 首请求 | 5538 bytes（由实际 R7 builder 计算，不沿用 R6 的 4855） |

R8 复用了既有 Phase B runtime/records/diagnostics/transport 和已验证的 UTF-8 捕获机制，没有复制第二套生成或结算引擎。

## 公开价格核对

准备阶段只访问官方公开价格页，未调用 provider 生成接口，也未读取余额或凭据。模型网络与公开价格核对网络分开报告：模型请求 0，公开价格页请求 1。

| 项目 | 值 |
| --- | --- |
| 官方页面 | `https://api-docs.deepseek.com/zh-cn/quick_start/pricing/` |
| 保存证据 | `C:\Users\Administrator\Desktop\deepseek-pricing-r8.html` |
| 获取时间 | 2026-10-29T14:45:17Z |
| 字节数 | 26182 |
| SHA-256 | `556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3` |
| 模型 | `deepseek-flash` / `DeepSeek-V4.1-Flash-1017` |
| 高峰输入 | 2,000,000 micro-CNY / 百万 tokens |
| 高峰输出 | 8,000,000 micro-CNY / 百万 tokens |

公开页内容与此前审查时的价格一致，因此沿用 35968/次、143872/四次和 160000 硬上限，没有加预算或换模型。页面 hash 与 R6 审查页相同；新的获取时间和本地证据路径进入 R8 价格快照。

## 候选身份

| 项目 | 值 |
| --- | --- |
| R7 promptHash | `89b1d4a87d53f41b697341dd32fb4bb3ad41b665e2a47b68a3d5e5464cbf3c38` |
| R7 offline identityHash | `e574d505ca4ce104507af00b19f72f63c99658d65cab1918ff6c3ad903e2287a` |
| sourceHash | `605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6` |
| matrixHash | `8c63b97380ca99e03c173d1fc9cb197250b5a17234533e7633ac41e757c197ae` |
| priceSnapshotHash | `c755ea8b5ca6e62d1c81899be0b1d1d884c03b2d6f02506caf20f624dd73ae3b` |
| executionDigest / pin | `ba7444d97ecbf21afab5d3e179db26505bbe0b9d52caee29fc4a2c0d8319ad00` |
| identityHash | `8c3195afb6025b1de4a6c8e713f7169692e4962f257416dc2720f9b0fb2b64e3` |
| releaseHash 候选 | `18d49f5e2321ed6d1b7481289610736c7e5b98a5e7eb0e19a28c3b7410e3f0aa` |

execution pin 覆盖 R8 接线、复用 Phase B 文件和固定配置；`execution-pin.mjs` 与 `execution-pin.ps1` 不进入自身摘要。代码和 manifest 同步漂移仍会被固定 pin 拒绝，旧 R6 许可不能授权 R8。

## 有限验证

### R8 专项

命令：

```
node --test test/dream-climate-live-r8.test.js
```

结果：21 pass，0 fail，duration 11.4885s。

覆盖：

1. 实际 R7 builder/normalization 的四次成功闭环；三幕、wake、四态 firstFeeling、独立 residue、后来回想为空。
2. 第三幕跨幕引文失败与 wake associations 对象数组失败；停止、保留 draft、有效 usage 恰一次 settled、不发布、不重试。
3. 新旧 release 不混用；正确 pin 匹配；批准摘要不匹配在凭据前拒绝；代码与 manifest 同步漂移拒绝。
4. 实际 Windows PowerShell secure-input 入口以无凭据 `-NonInteractive` 跑到 worker preflight，输出 `first request 5538 bytes, reservation 35968 micro-CNY`；随后在 Key 提示处因非交互模式退出，release 已撤销、真实 Store 未创建。
5. UTF-8 路径与 receipt：中文、非 BMP、引号和换行；正常结果、空结果、错误退出、不可解析结果；临时 release 清理；receipt 独占写入。
6. admission 在 Key 前核对身份、价格、目录；零凭据、零真实 Store、零模型请求；旧 R6 admission 继续拒绝。
7. 固定 Store 路径、目录已存在、第二场、第五次调用和重启边界。

### 受影响的 R7 / scene / wake 回归

命令：

```
node --test test/dream-climate-offline-r7.test.js test/dream-climate-offline.test.js test/generated-wake-offline.test.js test/dream-climate-live-r6-entry.test.js
```

结果：29 pass，0 fail，duration 2.6905s。

R7 同幕证据专项、气候/机制/锚点结构、wake 四态与逐字 fragment 继续通过；旧 R6 入口在凭据、Store 和网络前失败关闭。

### 首次失败与修正

1. 首次跑 R8 专项时，`actual Windows PowerShell preserves UTF-8 capture and receipt bytes` 因新目录缺少 `utf8-roundtrip.ps1` / `utf8-stub.mjs` 失败。补齐 R8 专用 UTF-8 测试辅助文件后重新生成 identity 与 execution pin，测试通过。
2. 摘要不匹配用例最初错误地期待 secure-input 先打印 `Admission ready`。实际入口在 admission digest 不匹配时会在该行之前拒绝；修正断言后通过。拒绝行为本身正确，未放宽入口。

## 改动文件

- 新增 `scripts/nv-dream-climate-offline-01/single-run-r8/` 的固定接线、identity、release、worker、dummy、admission、价格与 UTF-8 receipt 辅助文件。
- 新增 `test/dream-climate-live-r8.test.js`。
- 新增本验证文档。
- 同步 `docs/construction-envelopes/2026-10-28-dream-climate-offline-v1.md` 到权威 blob `243fdf153b63cb16df3fd7501c2cdb966a330f6b`。

没有修改共享 `src/`、`protocol.mjs`、source、fixtures、情绪语义、wake schema、R1–R7 历史回执或旧批准 pin；没有刷新旧 identity 来继续使用旧许可。

## 边界证明

- 真实 Key 读取：0；凭据提示：未执行。
- 真实用户/旧 Store 读取：0；R8 Store 创建：0。
- 模型生成请求：0；模型网络：0。
- 公开价格页请求：1，仅准备阶段核对价格。
- 真实费用：0；paid calls：0。
- 可执行 release 遗留：0；R8 Store 遗留：0。
- 第二场、第五次、重试、替代 run：0。
- 后来回想：空。

## 唯一候选入口

以下命令只作为总控审核后的候选，本轮未执行、未提示用户输入 Key：

```
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01\scripts\nv-dream-climate-offline-01\single-run-r8\secure-input.ps1 -PriceFile C:\Users\Administrator\Desktop\deepseek-pricing-r8.html
```

到此停止，等待总控审阅。单场成功后仍不等于三气候、长期质量或完整 V1 验收；不自动追加修正包或新场。

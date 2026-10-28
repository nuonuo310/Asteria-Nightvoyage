# NV-DREAM-CLIMATE-LIVE-R2 Phase B validation

状态：`READY_FOR_USER_SECURE_INPUT_R2`

本回执只证明失败路径计数与回执诚实性已修正。没有读取 Key、没有调用真实模型、没有创建真实 Store、没有产生费用，也没有 ready、合并或部署。

## 固定身份

- R1 candidate HEAD：`8a7c42116a50261f844097de8427c9790b5d8fcc`
- R1 tree：`ab114099b893ff4417b6a4feef7c1ef08d7df23b`
- offline identityHash：`f88fccb0349b0004db6c81deb0261f3d620f06480ab24b4a9c3aee2f94cfae28`
- R2 live identityHash：`54393cfd54ebef8d86afbb2922cc3ab0d8a2657ccf690b695691ac4ddb3528d3`
- releaseHash（保持）：`ee7ab9fbb6f71b582b442d27000d17f153dbfff1ac378ae4691cbfc869401bae`
- matrixHash（保持）：`05247698e2b4e13989f40edb4c25ce8ad21a901a162ea1c9f7556e69dfcce7eb`
- priceSnapshotHash（保持）：`247b8a83415ea54b05b43e2162d74ceef093824f6d2aba1b478028890cc85522`
- 官方价格页 SHA-256（保持）：`556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3`

执行文件清单从 18 个变为 19 个；冻结的五个离线执行文件不变，prompt、source、fixture、matrix、价格、Store 和预算均未修改。

## R2 修正

- transport dispatch 前维护进程内单调计数：`networkAttempts` 与 `realModelRequests`。
- worker 正常、部分失败与兜底回执改用实际计数，并报告 `requestOutcomeKnown`。
- 父进程在凭据已交付但 child 异常退出或输出不可解析时，报告两个计数为 `null`、`requestOutcomeKnown:false`，不伪装为 0。
- 部分 run 回执保留未提交账务行，明确显示 `settled` 与 `unknown`，不再漏掉失败的 dispatch 行。
- preflight、dummy 和凭据前拒绝仍精确报告 0。
- secure-input 只在无凭据 admission 为 `READY_FOR_USER_SECURE_INPUT_R2` 后提示一次 Key。

## 定向测试

- `node --test test/dream-climate-live-r2.test.js`：7 pass / 0 fail，exit 0。
- 首次 dispatch 失败：`networkAttempts=1`、`realModelRequests=1`，唯一账务行为 `unknown`。
- 两次成功、第三次失败：计数 3/3，账务为 `settled / settled / unknown`，无重试。
- fake live transport 全部成功：计数 12/12，与 12 条 `settled` ledger row 一致。
- credential 已交付后 child 异常退出或不可解析：计数 `null`、`requestOutcomeKnown:false`。
- worker 已报告正整数时，launcher 保留 1/1，不回写 unknown。
- preflight 与 dummy：两个计数均为 0，`requestOutcomeKnown:true`，dummy 12 个 fake calls 不计入 realModelRequests。

## 回归与准入

- `node --test test/dream-climate-live-r1.test.js test/dream-climate-live-r2.test.js`：17 pass / 0 fail。
- `node --test test/dream-climate-offline.test.js`：11 pass / 0 fail。
- 51 项最小回归：51 pass / 0 fail。
- 旧付费入口：`inline_paid_entry_refused`，credential/key/network/real-model 均为 0。
- versioned wake admission：exit 0，credential/network/real-model 均为 0。
- admission：`READY_FOR_USER_SECURE_INPUT_R2`，sentinel supplier 0，network 0，real Store 0。
- `git diff --check`：exit 0。

## 唯一 secure-input 命令

只有用户在普通 PowerShell 中主动运行以下命令，才允许后续一次真实批次。本轮没有运行它，也没有提示或读取 Key。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01\scripts\nv-dream-climate-offline-01\phase-b\secure-input.ps1 -PriceFile C:\Users\Administrator\Desktop\deepseek-pricing-r1.html
```

## 边界

- 未修改 `prompt`、`source`、`fixture`、`matrix`、价格、Store、预算、共享 `src/` 或五个离线执行文件。
- 未读取或提示 Key，未创建真实 Store，未调用真实模型，未产生费用。
- 未重试、ready、合并、部署或开启下一包。

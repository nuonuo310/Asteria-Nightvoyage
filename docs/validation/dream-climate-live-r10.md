# NV-DREAM-CLIMATE-OFFLINE-01 · R10 单场闭环准备

状态：`READY_FOR_TOTAL_CONTROL_REVIEW_R10`

本轮只准备 R9 后的一次固定单场闭环。没有读取 Key、余额或真实用户 Store，没有调用模型，没有产生费用，没有重试，也没有 ready、合并、部署或启动 R11。

## 固定点

| 项目 | 值 |
| --- | --- |
| 权威提交 | `377de3adf45b61550bfbfcb90dae966bba869ca2` |
| 权威文件 blob | `dee714b693169a8df69b00cac7a88f805cea582c` |
| 实现起点 | `fe0afa3ee734611bc949de33b61e4d19e2151f13` |
| 起点 tree | `cfbf1f9e35ce78835a09077b1424711002c45694` |
| 起点 parent | `fe0b196a0a22210107205a0a6660955251c8f724` |
| worktree | `C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01` |
| branch | `codex/nightvoyage-dream-climate-offline-01` |
| Draft PR | `#109` |

R10 新增独立薄接线，复用 R9 protocol、Phase B runtime/records/diagnostics/transport 和 UTF-8 receipt 机制。共享 `src/`、prompt、source、fixtures、气候/机制语义、情绪规则、wake schema 与 R9 canonicalization 未改写。R8 历史 receipt、Store、账务和既有文档未改写。

## 唯一运行配置

| 项目 | 值 |
| --- | --- |
| profile | `r10` |
| runId | `nv-dream-climate-one-dream-r10-a` |
| allowanceId | `nv-dream-climate-one-dream-r10-001` |
| Store | `C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r10-01` |
| matrix | `ordinary / transformation / cup_tap`，两个 used ledger 均为空 |
| 调用 | 1 场、3 scene + 1 wake、最多 4 calls；无重试、无第二场、无替代场、无第五次 |
| 请求上限 | 16384 UTF-8 bytes；`max_tokens=400` |
| 预算 | 35968 micro-CNY/call；143872 四次最坏；硬上限 160000 micro-CNY |
| 首请求 | 5538 bytes |

## 价格核对

只读核对已保存的官方价格证据，没有联网刷新价格页面。

| 项目 | 值 |
| --- | --- |
| 证据文件 | `C:\Users\Administrator\Desktop\deepseek-pricing-r8.html` |
| SHA-256 | `556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3` |
| 模型 | `deepseek-flash` / `DeepSeek-V4.1-Flash-1017` |
| 高峰输入 | 2,000,000 micro-CNY / 百万 tokens |
| 高峰输出 | 8,000,000 micro-CNY / 百万 tokens |

文件哈希、固定模型与固定价格均匹配，因此沿用原预算，未换模型、加预算或抓取别的页面。

## R10 候选身份

| 项目 | 值 |
| --- | --- |
| R9 offline identity | `153503232906afd729d78054cc199ee71a9ea6aca8ebfd7ddfb6ebe7283ac867` |
| promptHash | `89b1d4a87d53f41b697341dd32fb4bb3ad41b665e2a47b68a3d5e5464cbf3c38` |
| sourceHash | `605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6` |
| matrixHash | `2708c23bd788b7657fa80947eec9a4fbdd8f0aee3909bdc4c66513ada0848df3` |
| priceSnapshotHash | `c755ea8b5ca6e62d1c81899be0b1d1d884c03b2d6f02506caf20f624dd73ae3b` |
| executionDigest / pin | `031f33667be0e50196256d75e2e4d84d70c590695048948660196c19fdffd151` |
| identityHash | `35eb75b67db3bfb5b05e820a8a8af67a5cae458b98eb07dc463fa384639a2f9a` |
| releaseHash 候选 | `9bb4d01e7fa0f4c717b92c6dbae689d86b1b2499134463ebdb721326bee90f76` |

execution pin 覆盖 R10 薄接线、R9 protocol、Phase B runtime/records/diagnostics/transport、固定 profile/matrix、价格、预算、Store、模型参数与无重试规则。`execution-pin.mjs` / `execution-pin.ps1` 不进入自身摘要；代码与 manifest 同步漂移仍会被固定 pin 拒绝。

## 有限验证

```text
node --test test/dream-climate-offline-r10.test.js
tests 15 / pass 15 / fail 0

node --test test/dream-climate-offline-r9.test.js test/dream-climate-offline-r7.test.js test/dream-climate-offline.test.js test/generated-wake-offline.test.js test/dream-climate-live-r6-entry.test.js
tests 40 / pass 40 / fail 0

node scripts/nv-dream-climate-offline-01/offline-check.mjs
status READY_FOR_HUMAN_OFFLINE_REVIEW
normalization nv-dream-climate-offline-normalization-v2
requests 12 / credentialReads 0 / networkAttempts 0 / paidCalls 0

git diff --check
clean
```

R10 专项覆盖：

1. 首请求 5538 bytes，低于 16384；system/prompt/source 与 R9 冻结值一致。
2. 实际 R10 runtime 的第一幕使用 R8 精确对象：event 逐字不变，`uncertainty 0.6 + null basis` canonicalize 为 UNKNOWN 0.5，审计保留 `dimension`、`receivedValue`、`canonicalValue`、`rule`、`sceneIndex`、`requestId`；正式梦簿 entry 不含技术审计。
3. 无 canonicalization、control 单独、uncertainty 单独、两维同时 canonicalization；checkpoint round-trip 与 received/canonical/rule/dimension/integrity/index/requestId/删除审计的篡改拒绝。
4. 非法 goal、跨幕/不存在引文、非法 affect、wake associations 对象数组、非法 firstFeeling 均在首处停止；有效 usage 恰一次 settled、无发布、无重试。
5. 新旧 release、identity、pin 不混用；代码+manifest 同步漂移、目录已存在、第二场、第五次均拒绝。
6. 实际 Windows PowerShell 以无凭据 `-NonInteractive` 路径跑到 Key 提示前停止；批准 digest 匹配/不匹配、UTF-8 中文/非 BMP/引号/换行、正常/空/错误/垃圾输出、receipt 独占写入与临时 release 清理通过。没有提供或读取 Key。
7. admission 阶段 credential supplier 0、真实 Store 0、模型/网络 0；R8、R6、R4 与旧 phase-b live 入口继续关闭。

首次 R10 专项运行有 5 个断言失败，原因是测试错误假设了 receipt/price 辅助对象的字段形状；实际业务拒绝与账务路径均未失败。修正断言后 15/15 通过，未放宽生产校验。

## 边界证明

- 真实 Key 读取：0；Key 提示：仅无凭据非交互测试，未完成任何 Key 输入。
- 真实用户 Store 读取：0；R10 Store 创建：0。
- 模型生成请求：0；模型网络：0；价格网络刷新：0。
- 真实费用：0；paid calls：0；自动重试：0。
- 可执行 release 残留：0；临时 release 清理通过。
- 第二场、第五次、替代 run：0。
- 后来回想：空。

## 唯一候选入口

以下命令只作为总控审阅后的候选，本轮没有以真实 Key 执行：

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01\scripts\nv-dream-climate-offline-01\single-run-r10\secure-input.ps1 -PriceFile C:\Users\Administrator\Desktop\deepseek-pricing-r8.html
```

到此停止。单场成功仍只证明一次结构闭环，不代表三气候、长期质量或完整 V1 验收；不自动开启 R11、ready、合并或部署。

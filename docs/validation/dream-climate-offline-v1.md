# NV-DREAM-CLIMATE-OFFLINE-01 验证回执

状态：`READY_FOR_HUMAN_OFFLINE_REVIEW`

本回执只证明离线结构、身份隔离、假调用排练和失败关闭；不证明真实模型质量、现实主观体验、正式 Memory/Mind、ready、合并或部署。

## 权威输入与工作树

- 仓库：`nuonuo310/Asteria-Nightvoyage`
- 工作树：`C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01`
- 分支：`codex/nightvoyage-dream-climate-offline-01`
- 固定实现基线 / 提交父节点：`7ec24e6d90c45af67fe251fc65f21c4d257bf476`
- Stacked Draft PR base：`codex/nightvoyage-rich-fictional-dream-sample-01`
- 权威提交：`9178f060fff4c4f5beb4342c99378c45bc9a27bc`
- 权威文件：`docs/construction-envelopes/2026-10-28-dream-climate-offline-v1.md`
- 权威 PR：#108

权威提交最初本地缺失，桌面包内 `authority.md` 与 `RESUME.txt` 先通过 `manifest.sha256` 校验。随后 `git fetch origin docs/nightvoyage-dream-climate-offline-01` 成功，提交 `9178f060fff4c4f5beb4342c99378c45bc9a27bc` 已在本地可验证，且父节点正是固定基线 `7ec24e6d90c45af67fe251fc65f21c4d257bf476`。包内 `authority.md`（`0fa623...`）与提交原字节（`20c4e414...`）仅差末尾一个空行；已按权威提交精确恢复，交付路径现与提交逐字一致：

- 权威提交内文件 / 交付路径：`20c4e414d873e4f4bd333ab45c1efc1e11f6a0c645259263b2978627fbbb1aba`
- 包内校验副本：`0fa6232d390446b205d65907444f239f22007d921cf6dfe403d3cec16584efb9`
- `RESUME.txt`：`0246a8ec240a0a17e9f61a9844945b2bff191a70357dc98d660d4fa08cfc09ef`

## 新增内容与冻结范围

- 新增 `scripts/nv-dream-climate-offline-01/`：独立协议、固定 fake case、身份清单、离线排练器。
- 新增 `test/dream-climate-offline.test.js`：11 项专项测试。
- 新增 `docs/examples/dream-climate-offline-v1.md`：三场完整 fake 阅读回执。
- 新增 `docs/validation/dream-climate-offline-v1.json`：机器可读排练回执。
- 新增本验证回执与已校验权威文件副本。
- 未修改 `src/`、#107 真实梦/账务/Phase B 身份、用户 Store、旧 allowance、旧 WIP、页面或其他 worktree。
- 未提供 live/provider/transport、CLI `forceClimate`、重试、第四场、后来回想、Memory/Mind 或真实 dispatch 入口。

## 身份与请求材料

- protocol：`nv-dream-climate-offline-v1`
- runtime：`nv-dream-climate-offline-fixture-runtime-v1`
- prompt：`nv-dream-climate-offline-prompt-v1`
- normalization：`nv-dream-climate-offline-normalization-v1`
- extraction：`nv-dream-climate-offline-receipt-v1`
- inventory：`nv-dream-climate-offline-inventory-v1`
- source：`rich-fictional-dream-sample-memory@1` / `605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6`
- promptHash：`9c855d8b3e3b2a55c3f58e36de4a9aee5dec07b706cbf675912632d6ff8dd119`
- 新包 execution inventory：5 个 `.mjs`，`identityHash=f88fccb0349b0004db6c81deb0261f3d620f06480ab24b4a9c3aee2f94cfae28`
- 旧付费核心 inventory：`c1e14b491c0249061fc13714575b8a67cd8b1fc4c24c39bde26b486be4af5ad2`，92 个文件，保持只读证据。

排练构造 3 场 × 4 次请求，共 12 次。请求体范围为 4,855 至 7,153 bytes，全部小于 16,384 bytes。12 个请求均携带逐字 source；user data 携带 climate、mechanism、foregroundAnchor 和累计 used ledger；system 只有两个 stage 版本，均不含 source 文本、anchor id 或 used ledger。

## 测试实数

首次专项测试为 9 pass / 2 fail，exit 1，失败原因均在本包内修复：

1. Windows 命令参数丢失提示词 JSON 的引号；改为 `\u0022` 转义后通过。
2. `dreamClimateIdentity()` 顶层缺少 `sourceHash`；补齐并重新生成身份清单后通过。

一次通过 `bash` 启动检查器的尝试被当前环境以 `E_ACCESSDENIED` 拒绝，随后改用 PowerShell 正常执行；这不是产品测试失败。

最终命令与结果：

- `node --test test/dream-climate-offline.test.js`：11 pass / 0 fail，exit 0。
- `node --test test/rich-fictional-dream-sample.test.js test/generated-wake-offline.test.js test/generated-wake-story.test.js test/fictional-source-probe.test.js test/wake-first-feeling.test.js test/versioned-wake-admission.test.js`：51 pass / 0 fail，exit 0。
- `node scripts/check-generated-wake-offline.mjs`：exit 0；旧付费入口 `inline_paid_entry_refused`，credential supplier / key reads / network / real model 均为 0。
- `node scripts/check-versioned-wake-admission.mjs`：exit 0；旧历史与候选源码隔离，credential reads / network / real model 均为 0。
- `node scripts/nv-dream-climate-offline-01/offline-check.mjs`：exit 0，3 runs / 12 requests，状态 `READY_FOR_HUMAN_OFFLINE_REVIEW`。
- `git diff --check`：exit 0。

未运行完整 `npm.cmd test`，因为共享 `src/` 未改动；按权威包执行了 scene/wake 相关最小回归集。

## 三场离线回执

所有叙事均标记为 `fictional fixture / not model output`；三场均完整列入 `docs/examples/dream-climate-offline-v1.md`，没有挑选或省略。

| case | climate | mechanism | foregroundAnchor | used ledger | 三幕 | firstFeeling | residue |
| --- | --- | --- | --- | --- | ---: | --- | ---: |
| A | `ordinary` | `transformation` | `cup_tap` | `[]` / `[]` | 3 | `present` | 0.07 |
| B | `uneasy` | `spatial_dislocation` | `rain_street` | `[cup_tap]` / `[transformation]` | 3 | `absent` | 0.11 |
| C | `nightmare` | `temporal_recurrence` | `ticket_date` | `[cup_tap,rain_street]` / `[transformation,spatial_dislocation]` | 3 | `omitted` | 0.16 |

- A：建立杯沿余音与可继续触摸的动作；scene/1 出现细白线与触摸动作；scene/2 细纹收拢、杯子移位并留下白屑；作者声明的变形是物体材质/边界变化。
- B：建立雨后小街、店门与街口距离；scene/1 门把与店门错位、街口退入雨幕；scene/2 街道缩回、店面变湿墙；作者声明的变形是空间容纳与距离关系失常。
- C：建立折票、模糊日期、候车线与广播；scene/1 广播原样重复、票面日期变成明天而站牌仍指刚才那班；scene/2 日期回模糊、候车线回到脚前、空站台重新站满人；作者声明的变形是时间顺序与重复偏移。

`firstFeeling` 四态由结构测试分别覆盖；三份固定 fixture 刻意展示 `present`、`absent`、`omitted`，没有把 climate 映射成心情，也没有把 `uncertain` 作为默认答案。

词面诊断只作可复现计数，`semanticJudgment=false`：A 的 `cup_tap` 计 12，B 的 `rain_street` 计 6，C 的 `ticket_date` 计 6；其余两组分别为 0。该结果不能冒充语义重复、缺失或文本质量判断。

## 零边界证明

- `credentialReads=0`
- `networkAttempts=0`
- `realModelRequests=0`
- `paidCalls=0`
- `costMicroCny=0`
- `realUserStoreAccessed=false`
- `storeOpened=false`
- `ownerLockCreated=false`
- `automaticRetries=0`
- `fourthRunStarted=false`
- `laterRecollectionsEmpty=true`
- `memoryMindIntegration=false`
- `liveDispatchAvailable=false`
- `qualityAssessed=false`
- `semanticSupport=not_assessed`

幕间变化、梦内变形和重复意象属于 fixture 作者声明；结构测试只证明请求形状、三幕结构、同幕逐字 evidence、fragment 逐字来源、四态字段、批内唯一性、12 次请求和 source 隔离。三场文本仍需人工直接阅读。

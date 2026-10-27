# NV-RICH-FICTIONAL-DREAM-SAMPLE-01 · Phase A 验证回执

日期：2026-10-27

状态：`READY_FOR_EXPLICIT_LIVE_APPROVAL`

固定基线：#105 `621074a9a57772d957e43bed8d26ea7fae3a0561`，tree `52da581c13f3d771a74a41c08b5a7c4319baf6e5`。

权威包：`c4f5786ccd6f46f60785df75059e2cd7c285d838:docs/construction-envelopes/2026-10-27-rich-fictional-dream-sample-v1.md`，已逐字纳入本分支；文件 7,872 bytes，SHA-256 `62bc9b52a385fb32f6d84f6583b42215b2d202601c16debb11478d4fb2c9458d`。

分支：`codex/nightvoyage-rich-fictional-dream-sample-01`。

Phase B 当前锁定：`phaseBRelease=null`、`dedicatedStoreDirectory=null`；未执行 Phase B，未 ready、未合并、未部署。

## 固定输入与身份

唯一 source 为包内逐字固定的虚构素材，`materialKind=fictional`、`isRealityFact=false`；memory 仅引用该 source，background unavailable、affect absent、mind denied、intents stale。三场使用同一 canonical snapshot，独立 run/request/session 身份。

| 项目 | 值 |
| --- | --- |
| protocol | `nv-rich-fictional-dream-sample-v1` |
| fake runtime | `nv-rich-fictional-dream-sample-fake-runtime-v1` |
| prompt | `nv-rich-fictional-dream-sample-prompt-v1` |
| normalization | `nv-rich-fictional-dream-sample-normalization-v1` |
| extraction | `nv-rich-fictional-dream-sample-extraction-v1` |
| authorization | `nv-rich-fictional-dream-sample-authorization-v1` |
| inventory | `nv-rich-fictional-dream-sample-inventory-v1` |
| identityHash | `851e443a44bb044e8f2153dd791cc47ec653713b3bdc7339c5a0513cbc2c44ea` |
| sourceHash | `605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6` |
| promptHash | `23ab5917e42bfbcf4f6072f43142d5d32b9c7e47f3d19b426aaa49612bf15bea` |
| priceSnapshotHash | `4a4cfc970a3e285756b9ce0703467c13ff3b76da4578a0f7e9f637d4a3ecd00d` |
| coreInventoryHash | `c1e14b491c0249061fc13714575b8a67cd8b1fc4c24c39bde26b486be4af5ad2` |
| core inventory | 92 files；旧 #101 后基线为 86 files，未修改旧 inventory |

新 identity 同时钉住包内全部 10 个执行 `.mjs`。清单外新增执行文件、任一清单文件漂移或核心 `src`/`fixtures`/`package.json` 漂移均失败关闭。

## 价格与硬上限

| 项目 | Phase A 合同值 |
| --- | --- |
| 价格来源 | `https://api-docs.deepseek.com/zh-cn/quick_start/pricing/` |
| 观察日 / 别名 | 2026-10-27 / `deepseek-flash`，观察指向 `DeepSeek-V4.1-Flash-1017` |
| 高峰输入 / 输出 | 2 / 8 元每百万 tokens |
| 单请求序列化 body | 上限 16,384 UTF-8 bytes |
| 输出 | 每次 `max_tokens=400` |
| 批次 | 3 runs × (3 scene + 1 wake) = 12 calls |
| 保守输入 / 输出上界 | 196,608 / 4,800 tokens |
| 单次最坏预留 | 35,968 micro-CNY |
| 12 次最坏费用 | 431,616 micro-CNY |
| allowance 绝对上限 | 480,000 micro-CNY |

离线实构请求范围为 4,062–6,398 bytes，全部低于 16,384-byte 上限。thinking、tools、Search/Fetch、流式、自动重试与修复调用均未启用。

## 十二请求证据

命令：`node scripts/nv-rich-fictional-dream-sample-01/offline-check.mjs`，退出码 0。机器回执：`docs/validation/rich-fictional-dream-sample-v1.json`。

- 捕获的是 runtime 实际构造并交给 fake simulator 的 12 个请求，不是 fixture 常量。
- 每场 stage 顺序为 `scene, scene, scene, wake`；sceneIndex 为 `0, 1, 2, 3`。
- 12 个请求均逐字包含唯一 source，且 memory 只引用该 source。
- scene/0 的前缀为 0；scene/1 为 1；scene/2 为 2；wake 为 3；`previousAffect` 每步与已保存前一幕的 `after` 一致。
- 同一 stage 索引在三场中的 system prompt 哈希完全一致；三场参数一致，均为 `deepseek-flash`、`max_tokens=400`、非流式、thinking disabled、JSON object。
- 三场分别完成 present / absent / uncertain firstFeeling；省略态由定向测试单独覆盖。所有状态均独立记录，没有从 fragment、residue 或 affect 自动映射。
- 每场发布三幕、wake、可选 feeling、模拟 residue 与四笔 settled 账务；后来回想为空。

## 定向与回归

| 检查 | 命令 | 退出码 | 结果 |
| --- | --- | ---: | --- |
| 本包定向 | `node --test test/rich-fictional-dream-sample.test.js` | 0 | 14 / 14 pass |
| #101/#103/#105 联合 | `node --test test/rich-fictional-dream-sample.test.js test/generated-wake-offline.test.js test/generated-wake-story.test.js test/fictional-source-probe.test.js test/wake-first-feeling.test.js test/versioned-wake-admission.test.js` | 0 | 51 / 51 pass |
| 离线 12 请求排练 | `node scripts/nv-rich-fictional-dream-sample-01/offline-check.mjs` | 0 | `COMPLETE_SYNTHETIC_ONLY` |
| #101 old paid gate | `node scripts/check-generated-wake-offline.mjs` | 0 | paid entry refused；credential supplier 0；network 0；旧 history 不变 |
| #103/#105 old paid gate | `node scripts/check-versioned-wake-admission.mjs` | 0 | paid entry refused；credential 0；network 0；旧 holds `8,812,800` 不变 |
| 完整套件 | `npm.cmd test` | 0 | 1,973 / 1,973 pass；fail 0 |
| 空白检查 | `git diff --check` | 0 | 无输出 |

定向覆盖：12 个实构请求、固定 source 与 sourceRefs、三幕累积、`previousAffect`、三场同 stage prompt/参数一致、firstFeeling 四态、无效 firstFeeling、无自动重试/替代 run、超请求字节、价格/源码/inventory 漂移、取消晚到、跨 run 隔离、干净 committed-prefix 恢复、第 13 次调用与第 4 场预算拒绝、后来回想非空拒绝、专用 Store 前置拒绝。

完整套件首次运行曾在 4 个无关 Windows symlink 测试上因本机 `EPERM: operation not permitted` 退出 1；未改动本包代码，立即以同一 `npm.cmd test` 重跑得到 1,973/1,973、退出码 0。该失败归因于当前 Windows 环境瞬时 symlink 权限，不作为本包通过项。

## Launcher 失败关闭

`launchRichSampleLive()` 在 `phaseBRelease=null` 时直接返回：

- `status=refused`、`reason=rich_sample_phase_b_release_required`；
- 未检查 Store 目录，未创建目录或 `owner.lock`；
- sentinel credential supplier 调用 0；
- `fetch` 调用 0，真实模型请求 0；
- 只读 receipt CLI 同样在打开 Store 前拒绝。

测试证明传入不存在的 Store 路径后目录仍未创建，且没有 owner lock。未来 Phase B 仍需本包精确 R1；普通继续、旧许可或 PR 状态均不能解锁。

## 边界与停止

- 未读取 Key、环境变量凭据、凭据存储、余额或真实用户 Store。
- 未发起模型或网络请求，未产生费用。
- 未修改 `src/` 冻结实现、旧许可、旧账本、unknown holds、历史梦或用户数据。
- 未把逻辑藏在 inventory 外；新包全部执行文件与复用核心 inventory 均被 identity 覆盖。
- 未执行 Phase B，未 ready、未合并、未部署，也未宣称语义质量。
- 到达 `READY_FOR_EXPLICIT_LIVE_APPROVAL` 后立即停止。

## 迭代修正记录

- 前缀恢复首次测试把 simulated crash 映射成普通 response rejection，导致状态为 failed；保留 `simulated_crash` 为 uncertain 后通过，且恢复仍只接受干净 committed prefix。
- 回执残响原先使用系统实际时钟，已改为使用提取参数 `now`，保证只读回执可复现。
- 回执增加了 batch/request/session 固定顺序、journal 结构、feeling 数量、dream/residue 来源和 3,600,000 ms residue 时长校验。
- identity 增加“清单外执行 `.mjs` 即失败”的集合校验。

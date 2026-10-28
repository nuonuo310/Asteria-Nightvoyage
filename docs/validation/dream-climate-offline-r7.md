# NV-DREAM-CLIMATE-OFFLINE-01 · R7 同幕证据边界离线澄清

状态：`READY_FOR_HUMAN_OFFLINE_REVIEW_R7`

本轮只做离线修正、fake transport 复现与定向验证。没有读取真实 Store 或 Key，没有提示凭据，没有请求模型或网络，没有新建付费许可，没有 ready、合并、部署，也没有新开 worktree、分支或 PR。

## 固定点

| 项目 | 值 |
| --- | --- |
| 权威提交 | `9c4d58dee4be16c1da29921fcc1dec1425252889` |
| 权威文件 blob | `7e16daa1bed90cf4ec03f9616e16b67324df857b`（工作树副本同 blob） |
| 实现起点 | `5885ebf8f7a73f53fd471e1680d21b9f6a457945` |
| 起点 tree | `cb675f41419616d8559402196123ebb0ed18c461` |
| worktree | `C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01` |
| branch | `codex/nightvoyage-dream-climate-offline-01` |
| Draft PR | `#109` |

R7 全文从上述提交逐字同步到工作树，`git hash-object` 与提交内 blob 相同。

## 历史被拒响应复现

权威包给出的历史模型响应（虚构、未发布）以逐字对象加入专项测试，不修改旧 fixtures，也不进入真实 Store。用实际 normalization（`normalizeDreamClimateScene` → generated-wake → compact-v2 → coupled-affect）复现：

| 项目 | 结果 |
| --- | --- |
| 拒绝错误 | `invalid_compact_evidence` |
| before | `{"valence":0,"arousal":0.1}` |
| 唯一失败引文 | `basis.uncertainty` = “日期被水汽洇得看不清了” |
| 该引文位置 | 仅存在于前幕 event，逐字出现在本幕 event 之外 |
| 其余引文 | `basis.control`、`affect.excerpt` 均逐字存在于本幕 event |

因此跨幕引用是可复现的拒绝原因；仅凭诊断名称没有断言它是唯一原因，这里由实际 normalization 得出。人工合规对照（把 uncertainty 换成同幕的“小街的积水暗下去”，其余逐字保留）可以通过，并保留模型原始 event、`goalEffect:0` 与原始 control 引文；该对照明确标注为人工测试变体，不覆盖历史响应，也不主张语义成立。

## 逐字段跨幕矩阵

同一份合规对象，逐个把引文换成前幕独有句子：

| 字段 | 结果 |
| --- | --- |
| `basis.goal[0]`（goalExcerpt） | 拒绝 `invalid_compact_evidence` |
| `basis.goal[1]`（outcomeExcerpt） | 拒绝 `invalid_compact_evidence` |
| `basis.control` | 拒绝 `invalid_compact_evidence` |
| `basis.uncertainty` | 拒绝 `invalid_compact_evidence` |
| `affect.excerpt` | 拒绝 `invalid_compact_evidence` |

反向对照保持原行为：同一句放进本幕 event 即可通过（匹配对象是本幕 event，不是句子黑名单）；合规同幕引文原样通过；无证据分支（`goal:null`、`control/uncertainty:null` 配 0.5、`affect:{kind:"unchanged"}`）通过，`goalEffect` 与 delta 均保持 0，不强迫任何情绪方向。

## Prompt 澄清

`scripts/nv-dream-climate-offline-01/protocol.mjs` 的 `sceneRules` 增加两条，明确 `previousScenes` 只提供叙事连续性和历史状态；`basis.goal` 两处引文、`basis.control`、`basis.uncertainty` 与 estimated `affect.excerpt` 必须逐字来自本次返回的 event；返回前核对但不输出核对过程；无证据时用既有 null/UNKNOWN、`goalEffect` 与 unchanged 表达，也不为通过校验把旧句搬进新幕。parser、normalization、wake 提示、source、fixtures、气候/机制/情绪语义、预算与价格均未改动。

| 项目 | 修改前 | 修改后 |
| --- | --- | --- |
| sceneRules 条数 | 10 | 12 |
| promptHash | `9fe4d0863983eae2eb8a969d89fd6ffc5eeab3ebec507bf263d0f27664fbdb66` | `89b1d4a87d53f41b697341dd32fb4bb3ad41b665e2a47b68a3d5e5464cbf3c38` |
| wakeSystem SHA-256 | `3b7b7f48afd0d93c68718f083dab9c4749d29cb8ccbb1968f36150d0a171b77e` | 同值（逐字未变） |
| 离线候选 identityHash | `e574d505ca4ce104507af00b19f72f63c99658d65cab1918ff6c3ad903e2287a`（由本轮生成） | — |

实际 builder 验证：三个 scene 阶段的 system 都带同一段澄清；`material.previousScenes` 长度分别为 0、1、2 且与前幕 event 完全一致；wake 阶段 system 与修改前逐字相同（SHA 相同），前幕仍完整传递三幕。新文字因此进入 prompt identity，wake 提示不受影响。

## 旧批准关闭

`promptHash` 变化后，所有冻结离线身份的候选按既有规则拒绝，而不是被刷新：

| 套件 | 结果 |
| --- | --- |
| `dream-climate-live-r6-entry.test.js`（本轮改为关闭检查） | 1/1 pass |
| `dream-climate-live-r6.test.js` | 3/20 pass，17 个以 `dream_climate_r6_offline_identity_changed` 拒绝 |
| `dream-climate-live-r4.test.js` | 3/31 pass，28 个同因拒绝 |
| `dream-climate-live-r3.test.js` | 1/18 pass，17 个同因拒绝 |
| `dream-climate-live-r2.test.js` | 3/7 pass，4 个同因拒绝 |
| `dream-climate-live-r1.test.js` | 6/10 pass，4 个同因拒绝 |
| `dream-climate-live-r5.test.js` | 4/5 pass，1 个 promptHash 断言失败（历史值已变） |
| `dream-climate-offline.test.js`（当前候选） | 11/11 pass |
| `rich-fictional-dream-sample-phase-b.test.js` | 9/9 pass |

按权威包要求，未刷新 R1–R6 的批准 pin、未重签旧身份、未改写旧回执；这些拒绝就是旧批准无法授权新源码的证据。旧套件未批量改写，保留原义。

真实入口关闭检查（实际 Windows PowerShell）：R6 Store 仍是此前用户真实运行时留下的目录，本轮未打开、未读取、未修改；`secure-input.ps1` 在 Key 前退出，退出码 1，原因为 `dedicated_store_already_present`（Store 保护先于 admission），且 `check-admission.mjs` 独立以 `dream_climate_r6_offline_identity_changed` 拒绝。两次都未生成 release、未打印 `Admission ready`、未出现 Key 提示。

## Fake transport 复现

复用离线 runtime 与 fake transport（dummy simulator，第三幕内容替换为历史被拒对象），身份使用测试内固定的冻结 R6 假设对象，仅用于驱动已存在的 runtime 路径，不打开任何入口、凭据或网络：

| 项目 | 结果 |
| --- | --- |
| 调用次数 | 3（scene 0、1、2） |
| wake 调用 | 0 |
| 保留草稿 | 2 幕 |
| 第三幕 | `failed`，`scene_response_rejected`，诊断 `originalError=invalid_compact_evidence` |
| 结算 | 三行均 settled，`settledChargeMicroCny > 0`，unknown 0 |
| 发布 | 0（无 entry、无 `wake`、无半套记录） |
| 重试 / 第二场 / 第五次调用 | 无 |

## 命令与实数

| 命令 | 结果 |
| --- | --- |
| `node --test test/dream-climate-offline-r7.test.js` | 4/4 pass，exit 0 |
| `node --test test/dream-climate-live-r6-entry.test.js` | 1/1 pass，exit 0 |
| `node --test test/dream-climate-offline-r7.test.js test/dream-climate-live-r6-entry.test.js test/dream-climate-offline.test.js test/generated-wake-offline.test.js test/scene-continuity-prompt.test.js` | 41/41 pass，exit 0 |
| `node scripts/nv-dream-climate-offline-01/generate-identity.mjs` | 5 个执行文件，identityHash `e574d505ca4ce104507af00b19f72f63c99658d65cab1918ff6c3ad903e2287a` |
| `git diff --check` | 无输出，exit 0 |

首次失败与修正：专项首轮 3 个测试失败——两处把 `goalEffect` 写成 0.4（contract 只接受 -1/0/1），一处把 runtime 记录的错误码写成 normalization 内部码，而 runtime 记录的是 `scene_response_rejected`。改正后 4/4 通过。关闭检查首轮误断言真实 R6 Store 不存在，实际该目录由用户更早一次真实运行留下；改为不触碰该目录，只断言入口拒绝与无 release。

## 边界

- 专项目标 Store：未创建；真实 R6 Store：未打开、未读取、未修改、未迁移。
- Key：未提示、未读取；环境变量、凭据库、PowerShell 历史均未访问。
- 网络与模型：0 请求，0 费用；未生成可执行 live release，未刷新任何批准 pin。
- 旧梦、旧账、旧回执与 R1–R6 历史身份保持原义。
- 这些测试只证明结构与处理路径，不证明模型服从率、文学质量或情绪质量；literal 匹配不构成语义支持。
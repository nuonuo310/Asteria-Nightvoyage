# NV-DREAM-CLIMATE-OFFLINE-01 · 夜航 V1 内容候选离线修订

状态：**单阶段离线施工权威包**。本包只建立版本化候选协议、假调用排练与人工可读样例；不授权真实模型、Key、用户 Store、余额、价格准入、付费、ready、合并或部署。完成后停止并交回总控。

固定实现基线：Draft PR #107 `codex/nightvoyage-rich-fictional-dream-sample-01@7ec24e6d90c45af67fe251fc65f21c4d257bf476`。该基线保存已经发生的三场真实批次及其技术证据；本包不得改写、删除、美化或重新解释旧梦与旧账，也不得修改 #107 既有执行身份来伪装旧批次使用了新协议。

先回读适用 `AGENTS.md`（如有）、`docs/v1-closure/V1-CLOSURE-PLAN.md`、本包、#107 当前协议与验证。发现已有同包 worktree、分支或 PR 时沿用，不重复或并发启动。Phase One 继续冻结。

## 背景证据与产品判断

#107 的真实批次证明三场、十二次调用、结算和独立记录链可以工作，但内容只部分通过：三场反复围绕雨后小街、杯沿与车票，九幕 affect 均保持 neutral/unchanged，firstFeeling 为 uncertain / uncertain / omitted。技术通过不能替代内容通过。

这不是“模型必须更戏剧化”的结论。安静、低唤醒、无明显心情仍然合法。当前最小差距是：

1. 同一素材连续生成时缺少显式的批内差异约束；
2. 场景延续允许只移动镜头，没有要求可观察状态发生变化；
3. 单一中性 scene 示例和单一 uncertain wake 示例可能形成输出锚点；
4. 当前没有正式 Memory/Mind，不能假装以真实长期状态动态调节梦或噩梦。

本包不接入 Memory/Mind，不导入外部梦境系统，不生成后来回想。只借用三个朴素设计形状：把“是否做梦”与“梦境气候”分开；把素材、梦中变化与醒后记录分开；同批已用的主意象不继续占据下一场中心。

## DONE LINE

在完全离线、零凭据、零网络、零费用条件下，交付一个独立的 V1 内容候选协议，能够：

- 为一次 dream run 固定选择 `ordinary | uneasy | nightmare` 之一；
- 在三幕内要求至少一次梦内变形，并要求后续幕发生可观察变化；
- 给同批多个 run 分配不同的形式机制和主素材锚点，并把已用主意象作为约束传递；
- 保持既有 scene appraisal/affect 证据语义与 wake fragment/firstFeeling/residue 独立语义；
- 生成三套强制气候的 fake 排练回执，供人工直接阅读全部三幕和 wake；
- 不提供任何真实 dispatch 入口。

本包完成只能得到 `READY_FOR_HUMAN_OFFLINE_REVIEW`、`BLOCKED` 或 `TOTAL_CONTROL_DECISION_REQUIRED`。不得宣称真实模型质量已经提高，也不得自动开启付费验证。

## 一、梦境气候契约

新增独立、版本化、纯函数候选，不原地改义 `generated-wake-offline-v1` 或 `nv-rich-fictional-dream-sample-v1`。

默认权重固定为：

| climate | 权重 | 语义 |
| --- | ---: | --- |
| `ordinary` | 0.65 | 日常、安静、温暖、古怪、空白或轻微失落均可；不等于积极 |
| `uneasy` | 0.30 | 有持续的不确定、错位、未完成或轻微失控；不要求恐怖 |
| `nightmare` | 0.05 | 核心是无法完成、重复回到原处、熟悉规则悄悄失效、失去行动余地或错过连接；不等于血腥、怪物、暴力或惊吓 |

要求：

1. “是否做梦”不在本包掷骰。进入候选 run 即生成一场梦；这里只选择气候。
2. 选择函数接受显式注入的 `roll`，范围 `0 <= roll < 1`，边界为 `[0,.65)`、`[.65,.95)`、`[.95,1)`。不得读取全局随机、时间或环境变量。
3. climate 在 scene/0 前确定，三幕与 wake 全程不变，并进入协议身份与实际请求材料。
4. `forceClimate` 只允许在 offline fixture/test helper 内使用，不得出现在 live launcher、CLI 参数、环境变量或普通产品入口。
5. climate 是虚构创作约束，不是现实情绪、心理状态、诊断或用户事实；不得从 residue、appraisal、firstFeeling 推导它，反向也不得从 climate 伪造 firstFeeling。
6. 允许任何 climate 最终没有明显情绪变化；不得为了匹配标签强造 appraisal 数值、正向结局或解释。

## 二、三幕变化契约

沿用三幕加一次 wake、第三人称“梦里的人”、不发明性别、不把现实用户称作“你”的边界。新增的规则必须描述**形式变化**，不能指定剧情：

1. scene/0 建立一个正在发生的具体瞬间，至少有一个可感知细节和一个可继续的动作余地。
2. scene/1 与 scene/2 各自必须让至少一项可观察状态改变：地点关系、物体状态、可采取的动作、已知信息、规则、距离、方向、时间顺序或行动后果。
3. 单纯换同义词、重复上一幕、只说“继续走了几步”、只移动镜头或只增加景物描写，不算变化。
4. 三幕合起来至少出现一次“梦内变形”：物体用途、空间规则、时间顺序、身份边界、尺度或因果中的任一项发生不现实但可感知的改变。
5. 不要求高潮、冲突、危险、悲剧、疗愈、意义、谜底或积极结局；安静变化可以很小，但必须留下前后差别。
6. scene 文本仍是唯一叙事正文。不要为了结构检查增加面向读者的解释、标签或总结。

结构测试只能证明请求携带这些规则，不能自动宣称生成文本在语义上合格。fake fixture 的变化由人工预写并明确标记为测试材料。

## 三、批内防重复契约

本包使用**形式轮换 + 显式主意象账本**，不声称具备语义理解或正式记忆。

### 形式机制

定义三个不带剧情的机制，并在三场离线样例中各用一次：

- `transformation`：某物的用途、材质或边界发生变化；
- `spatial_dislocation`：空间、距离、入口、方向或容纳关系失常；
- `temporal_recurrence`：时间顺序、年龄、先后或重复出现偏移。

机制只要求“至少一次体现”，不得规定具体物件、关系含义或结局。候选 builder 必须把本 run 的机制及此前已用机制放入 user 数据；system 只包含通用解释，不把用户数据拼成 system 指令。

### 主意象账本

针对本包沿用的固定虚构 source，声明三个 source anchor group：

- `rain_street`：雨、雨停、小街、街道；
- `cup_tap`：杯、杯沿、敲击；
- `ticket_date`：车票、票面、日期。

每场离线样例只分配一个 `foregroundAnchor`，三场不得重复。其余 source 内容仍可作为背景事实出现，但不得继续成为该场标题、开场中心、三幕共同主轴或 wake 唯一意象。

请求材料必须包含：

- 当前 `foregroundAnchor`；
- `usedForegroundAnchors`；
- `usedMechanisms`；
- 一条明确说明：这些值是批内创作约束，不是长期记忆、现实事实或模型人格。

实现可以对上述固定词组做精确/词典命中统计，作为诊断；不得把词面未命中冒充语义未重复。人工回执必须同时列“声明主意象”和“文本实际仍重复的意象”。

不要新增一次模型调用来提取意象，不要用 wake、firstFeeling、residue 或后来回想充当主意象分类器。

## 四、去锚定与既有语义

1. 保留现有 scene 输出字段及校验：`event / appraisal / basis / affect`。保留 UNKNOWN 0.5 语义、逐字证据、before/delta/after 计算与范围校验。
2. 不再把一份带 `goalEffect:0, control:.5, uncertainty:.5, affect:unchanged` 的完整内容示例作为唯一 scene 示范。改成无偏好的结构/联合类型说明，或同时覆盖合法分支且明确“示例值不可复制”；不能放宽解析器。
3. wake 保留 `fragment / associations / residue / optional firstFeeling`。fragment 仍须逐字来自前三幕；residue 仍是 `0..0.3` 的模拟估计；firstFeeling 的 omitted/present/absent/uncertain 四态继续独立。
4. wake 提示不得以一个具体 `uncertain` 对象作为默认答案。可以列联合类型，但四态没有首选项。
5. 不从 climate、appraisal、affect、fragment 或 residue 自动生成 firstFeeling；不从 firstFeeling 反推 climate。
6. 原梦、wake 残片、刚醒心情、模拟余韵与后来回想继续分栏；后来回想保持未记录。
7. 技术模型名只在审计回执出现，不进入面向糯糯的梦簿主阅读面。

## 五、实现边界

允许新增：

- 独立候选协议模块；
- `scripts/nv-dream-climate-offline-01/` 下的纯离线演示/检查器；
- 专项测试；
- `docs/validation/` 回执；
- 一份包含三场完整 fake 梦的纯文本或 Markdown 人工阅读样例。

优先复用既有 parser、scene/wake normalization 与只读 view，不复制出第二套语义漂移的 records/runtime。

冻结且不得修改：

- #107 已保存的真实梦、真实账务、Phase B receipt 与 release 历史；
- `scripts/nv-rich-fictional-dream-sample-01/phase-b/` 的既有真实执行身份；
- 用户 Store、旧历史 Store、Key、凭据存储、余额、价格快照和旧 allowance；
- 旧 WIP 与其它 worktree；
- Dreambook 页面美化、插图、持续余韵、正式 Memory/Mind/Asteria bridge；
- 任何 live transport、真实 provider 入口、自动重试或修复调用。

新增源码会改变候选 source inventory；旧付费入口必须继续失败关闭。不得刷新旧清单、重签旧许可或让旧 release 适配新源码。

## 六、离线排练与测试

建立三场固定 fake case，全部使用同一份 #107 固定虚构 source，但分别强制：

| case | climate | mechanism | foregroundAnchor |
| --- | --- | --- | --- |
| A | `ordinary` | `transformation` | `cup_tap` |
| B | `uneasy` | `spatial_dislocation` | `rain_street` |
| C | `nightmare` | `temporal_recurrence` | `ticket_date` |

每场仍为三幕加 wake。fake 文本必须由施工端明确预写并标记 `fictional fixture / not model output`；不得冒称模型作品或真实主观体验。三场都要完整展示，不挑最好的一场。

专项测试至少覆盖：

1. roll 边界：0、.649999、.65、.949999、.95、接近 1；非法值失败；
2. climate 一场内固定，不能在 scene/wake 中漂移；
3. 三种 mechanism/anchor 不重复，第四场或重复分配失败；
4. used ledger 进入 user data，不进入 system；注入文本仍是惰性数据；
5. scene/1、scene/2 获得前幕、climate、mechanism、anchor/used ledger；
6. wake 获得三幕但不把 climate 映射为 firstFeeling/residue；
7. scene 与 wake 的结构校验、逐字 fragment、四态 firstFeeling、无效额外字段继续成立；
8. fake 三场均呈现至少一项人工声明的幕间变化和一次梦内变形；
9. 当前 source anchor 的词面诊断可复现，且明确不等于语义判定；
10. 旧 #107 live/paid 入口在候选源码下仍失败关闭，sentinel credential supplier 0、network 0、真实 Store 0；
11. 不创建 owner.lock，不读取 Key/环境凭据/用户 Store，不请求模型；
12. 没有后来回想、第四场、重试、替代 run 或自动下一包。

运行：

- 新专项测试；
- #101/#103/#105/#107 与 scene/wake 相关的最小回归集；
- 旧付费失败关闭检查器；
- `git diff --check`；
- 若改动触及共享 `src/`，完整 `npm.cmd test` 只跑一次；首轮若仅因已知 Windows symlink/EPERM 偶发失败，可隔离核对后再完整重跑一次，并如实记录两轮，不得无限重试。

不用截图，不做视觉 QA，不运行真实 provider。

## 七、人工离线验收

回执逐场列出：

- climate、mechanism、foregroundAnchor 与 used ledger；
- 三幕原文；
- scene/0 建立了什么；
- scene/1 与 scene/2 分别改变了什么；
- 梦内变形是什么；
- appraisal/affect 是否有同幕证据；
- wake fragment 是否逐字；
- firstFeeling 的真实记录状态；
- simulated residue；
- 实际仍重复了哪些意象；
- 哪些判断只是 fixture 作者声明，哪些由结构测试证实。

总控只在以下条件同时满足时考虑后续一次小规模真实验证：

1. 请求不再用单一 neutral/unchanged 与 uncertain 具体示例锚定；
2. 三场 fake case 的结构确实允许普通、不安、非恐怖噩梦三种气候；
3. 后续幕规则要求状态改变但没有强迫戏剧化；
4. 防重复只约束批内主意象和形式，不虚构正式记忆；
5. 旧安全、账务和付费入口保持失败关闭。

即使全部满足，也只表示离线候选可供人工审核，不自动授权真实调用。

## 八、施工与交付

从固定 #107 head 建立独立 worktree：

- 建议目录：`C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01`
- 分支：`codex/nightvoyage-dream-climate-offline-01`
- stacked Draft PR base：`codex/nightvoyage-rich-fictional-dream-sample-01`

只允许一个实现 PR。提交并推送后报告：

- worktree、分支、HEAD、tree、parent；
- changed files 与 forbidden changes；
- protocol/prompt/source inventory identity；
- 每条测试命令、实数、退出码和首次失败；
- 零凭据、零网络、零真实 Store、零模型、零费用证明；
- 三场完整 fake 阅读回执；
- PR 的 Draft/open/base/head 状态。

状态达到 `READY_FOR_HUMAN_OFFLINE_REVIEW`、`BLOCKED` 或 `TOTAL_CONTROL_DECISION_REQUIRED` 后立即停止。保持 Draft；不 ready、不合并、不部署、不评论旧 PR 为通过、不创建下一包。

## STOP 条件

出现任一项立即停止并回执：

- 必须修改或伪造 #107 既有真实内容/账务才能实现；
- 必须读取 Key、用户 Store、余额或发网络模型请求；
- 必须接入正式 Memory/Mind 才能满足本包；
- 无法让新增 source identity 与旧付费 release 明确隔离；
- 需要第四场、重试、修复调用或新增内容评分模型；
- 同包已有施工正在运行；
- 固定基线不存在或漂移且无法精确恢复。


---

# R1 · 三气候一次性真实内容验证

日期：2026-10-28

总控裁决：离线候选达到 `READY_FOR_HUMAN_OFFLINE_REVIEW`，人工阅读确认三场 fixture 已能表达普通、不安与非恐怖噩梦，并且每幕存在可观察变化；这只通过离线设计，不通过真实模型质量。糯糯随后明确同意继续小规模真实验证。本 R1 恢复同一 worktree、同一实现分支与同一 Draft PR #109，只授权一次固定矩阵真实批次；不得另开实现包或 PR。

## R1 固定候选

- 实现 PR：#109
- HEAD：`119a6ba909cfaa75b29bd3d4c4fcf9500996e2bd`
- tree：`ab4171b8f18fe49060d4f649c4b1672d09200abe`
- parent：`7ec24e6d90c45af67fe251fc65f21c4d257bf476`
- protocol：`nv-dream-climate-offline-v1`
- runtime：`nv-dream-climate-offline-fixture-runtime-v1`
- prompt：`nv-dream-climate-offline-prompt-v1`
- normalization：`nv-dream-climate-offline-normalization-v1`
- extraction：`nv-dream-climate-offline-receipt-v1`
- promptHash：`9c855d8b3e3b2a55c3f58e36de4a9aee5dec07b706cbf675912632d6ff8dd119`
- sourceHash：`605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6`
- offline execution identityHash：`f88fccb0349b0004db6c81deb0261f3d620f06480ab24b4a9c3aee2f94cfae28`

冻结的五个离线执行 blob SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `fixtures.mjs` | `04ecad144ab7f5998baad126fe3f78ba0935616b3bfc5352da1f41d1cd606914` |
| `generate-identity.mjs` | `469ed4561f048243226597c747c7d5348b92afe6efceb4d35bf7e816abb47793` |
| `identity.mjs` | `33c8c8a061eb900456d62218499bc9f59b74bd6e327040198f0aa05be3f2f910` |
| `offline-check.mjs` | `8bc2d9d879e68c2ea4e61431f411743e61ef584f5f2a4f0d97b1d8be183bdaf3` |
| `protocol.mjs` | `b7659c829e1b5150663a0d5f8d2863233e46c9a72c5966448533a15004a44e09` |

R1 实施前必须逐字节复核以上身份。任一漂移均 STOP，不得“更新到最新”后继续。

## 价格与预算

唯一价格权威：
https://api-docs.deepseek.com/zh-cn/quick_start/pricing/

2026-10-28 总控重新核对：

- model alias：`deepseek-flash`
- observed model：`DeepSeek-V4.1-Flash-1017`
- 高峰缓存未命中输入：2 CNY / 1M tokens
- 高峰输出：8 CNY / 1M tokens
- 空闲价格为高峰一半；预算仍按高峰缓存未命中计算
- Search / Fetch 禁用，工具禁用，thinking 禁用，stream 禁用

每次完整序列化请求体不得超过 16,384 UTF-8 bytes；每次 `max_tokens=400`；固定三场、每场 3 scene + 1 wake，总计最多 12 calls。按 1 byte/token 的保守本地上界：

- 最坏输入：196,608 tokens
- 最坏输出：4,800 tokens
- 最坏费用：431,616 micro-CNY
- 本 R1 绝对硬上限：480,000 micro-CNY（0.48 CNY）

模型别名、实际模型、币种、价格、请求上限、输出上限、场数、调用数或预算任一不符时，在凭据供应和 Store 创建前失败关闭。

## 固定真实验证矩阵

本次不是产品自然抽样，而是协议分支验证。三场顺序及约束逐字固定：

| run | climate | mechanism | foregroundAnchor | usedForegroundAnchors | usedMechanisms |
| --- | --- | --- | --- | --- | --- |
| A | `ordinary` | `transformation` | `cup_tap` | `[]` | `[]` |
| B | `uneasy` | `spatial_dislocation` | `rain_street` | `["cup_tap"]` | `["transformation"]` |
| C | `nightmare` | `temporal_recurrence` | `ticket_date` | `["cup_tap","rain_street"]` | `["transformation","spatial_dislocation"]` |

这不是可供用户选择的 `forceClimate` 产品入口。矩阵必须作为 R1 release 的固定常量与 identity 一起哈希；不得暴露 CLI/env 参数来更换 climate、mechanism、anchor、source、run 数或顺序。

三场均使用 #109 同一固定虚构 source、同一 system prompt、同一模型参数；只有上表中声明的 batch-local user data 不同。每场完整保留，不按质量重试，不挑最好的一场，不添加第四场。

## R1 Phase B 施工授权

沿用现有 worktree：

`C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01`

沿用分支与 Draft PR：

- `codex/nightvoyage-dream-climate-offline-01`
- PR #109，base 保持 `codex/nightvoyage-rich-fictional-dream-sample-01`

只允许新增专用 `scripts/nv-dream-climate-offline-01/phase-b/`、对应测试和验证回执；允许为新 live identity 生成独立 manifest。冻结上述五个离线执行文件、固定 source、prompt、fixture、#107 全部真实历史、账务和旧 Phase B 文件。不得修改共享 `src/`，除非无法复用且先 STOP 交回总控；不得在本 R1 自行放宽。

Phase B 必须：

1. 使用 #109 的实际 request builder 与 normalization，不复制或改写 prompt；transport 只发送 builder 产生且通过边界检查的请求。
2. 建立新的 live identity，覆盖冻结候选、所有新增 live 执行 blobs、固定矩阵、官方价格快照、模型、专用 Store、12-call/0.48-CNY 上限和无重试条款。
3. 专用 Store 逐字固定为：
   `C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-live-01`
   必须在凭据提示前验证 parent、basename、dedicated prefix 与真实路径；不得读取、迁移或删除其它 Store。
4. 新 launcher 默认失败关闭。没有精确 R1 release、价格证据、固定身份或专用 Store 准入时，在读取 Key、创建真实 Store/owner.lock、供应凭据或网络请求前拒绝。
5. 先用 dummy simulator 与临时同 basename Store 排练三场，证明 owner.lock 创建/关闭/清理、每场前缀恢复、取消晚到、逐场原子发布、12 次后拒绝第 13 次、零自动重试和跨 run 不串 scenes/ledger。
6. 凭据只允许从用户主动运行的私密一次性 PowerShell secure-input 管道供应一次。不得读取环境变量、系统凭据存储、剪贴板、命令行明文、文件 Key 或余额；不得打印、持久化或继承 Key。
7. secure-input 命令必须接受用户显式提供的官方价格 HTML 路径，并在显示 Key 提示前完成所有不需要凭据的准入。准入失败不得询问 Key。
8. 三场严格串行。每场最多四次调用；任一调用失败、解析失败、账务 unknown、取消或超界时不重试、不修复、不替代。已完成的场保持原字节；后续是否继续只按预先写死的安全状态机处理，不能生成第四场。
9. 每场的三幕、wake、可选 firstFeeling、simulated residue 与四笔账务保持受管理一致。后来回想为空；climate 不映射为 firstFeeling 或 residue。
10. 完成或停止后撤销临时 release、关闭 Store、确认 owner.lock 清除，生成机器可读与人类可读真实回执并提交到同一 PR #109。

## 先到 READY_FOR_USER_SECURE_INPUT_R1

施工端首先只完成 Phase B 准入、dummy 排练、测试、identity 和 secure-input；不得代用户输入 Key，不得自行执行真实批次。

至少验证：

- 新 Phase B 定向测试；
- #109 11 项专项与相关 51 项回归；
- 旧付费入口继续 `inline_paid_entry_refused`；
- 无 release / 漂移价格 / 漂移 identity / 错 Store / 第 13 call / 重复 run / 晚到响应均失败关闭；
- admission 运行时 credential supplier 0、network 0、real Store 0；
- `git diff --check`；
- 若仍未修改共享 `src/`，无需重跑完整 npm 测试；若修改共享 `src/`，STOP，不自行扩大验证。

提交、推送 #109 后回执精确 HEAD/tree、Phase B identity/release hash、官方价格页 SHA-256、请求字节实数、预算和唯一 secure-input 命令。状态只允许：

- `READY_FOR_USER_SECURE_INPUT_R1`
- `BLOCKED`
- `TOTAL_CONTROL_DECISION_REQUIRED`

达到任一状态立即停止。不得自动提示多次、重试、运行模型、ready、合并或部署。

## 用户执行后的唯一真实批次

只有用户在普通 PowerShell 主动运行施工回执给出的唯一 secure-input 命令，才允许一次真实批次。

真实执行必须产生逐场完整回执：

- run / climate / mechanism / foregroundAnchor / used ledger；
- 三幕原文与逐幕 appraisal、basis、before/delta/after；
- wake fragment 与逐字 scene basis；
- associations；
- firstFeeling 的 omitted/present/absent/uncertain 真实返回；
- simulated residue；
- 每次 token usage、charge、attempt status；
- source、prompt、identity 与 release；
- 实际仍重复的意象，由总控后续人工判断，不由词面计数冒充。

总费用、调用数与场数必须同时列出。任何质量结果都保留，不重试、不替换、不再付费追加。

## 完成后的裁决边界

真实批次完成只交回总控人工内容评审。测试通过不等于内容通过；fixture 不得混入真实结果。

哥哥将逐场判断：

- 是否有不照抄素材的可记画面；
- scene/1 与 scene/2 是否真有状态改变；
- 梦内变形是否自然而非完成提示词作业；
- ordinary / uneasy / nightmare 是否有区别又不过度题材化；
- appraisal 与 affect 是否有同幕语义依据；
- firstFeeling、fragment、residue 是否仍然彼此独立；
- 三场是否仍换词重复同一种梦。

本 R1 不授权合并 #109、更新正式 V1 DONE LINE、接入 Memory/Mind、生成后来回想、再跑第二批、优化页面或开启下一包。

## R1 STOP

出现任一项立即停止：

- 固定 #109 HEAD/tree、五个离线执行 blob、promptHash、sourceHash 或 identityHash 不符；
- 官方价格或模型别名无法精确核对；
- 需要读取环境 Key、凭据存储、余额或任意既有用户 Store；
- 需要修改 prompt/source/fixture/shared src 才能接 live；
- 无法把新 live identity 与 #107 旧 release/allowance 隔离；
- 需要重试、修复调用、第四场、额外评分模型或泛化 forceClimate 入口；
- 同一 Phase B 已有任务或真实批次在运行；
- 无法保证停止后 release 撤销与 owner.lock 清理。


---

# R2 · 失败回执网络计数诚实性修正

日期：2026-10-28

状态：仅修正一次真实批次前的失败回执。R1 候选尚未运行真实模型、未读取 Key、未创建真实 Store、未产生费用。

固定 R1 实现候选：

- PR #109 HEAD：`8a7c42116a50261f844097de8427c9790b5d8fcc`
- tree：`ab114099b893ff4417b6a4feef7c1ef08d7df23b`
- parent：`119a6ba909cfaa75b29bd3d4c4fcf9500996e2bd`
- offline identityHash：`f88fccb0349b0004db6c81deb0261f3d620f06480ab24b4a9c3aee2f94cfae28`
- live identityHash：`42fda7ae6b3667c46c3f6b38cc2e16bdf3823fa840759a6e50d558904f633828`
- releaseHash：`ee7ab9fbb6f71b582b442d27000d17f153dbfff1ac378ae4691cbfc869401bae`
- matrixHash：`05247698e2b4e13989f40edb4c25ce8ad21a901a162ea1c9f7556e69dfcce7eb`
- priceSnapshotHash：`247b8a83415ea54b05b43e2162d74ceef093824f6d2aba1b478028890cc85522`

## 已证实缺口

`phase-b/worker.mjs` 的通用 `blocked()` 当前硬编码：

- `networkAttempts: 0`
- `realModelRequests: 0`
- `executed: false`

普通 provider/解析失败通常由 runtime 捕获并进入持久 receipt，因此不一定触发该兜底；但如果凭据供应后、dispatch 已发生后出现逃出 runtime 的异常、Store poisoned、worker failure 或其它灾难性路径，上述硬编码可能把已经发生或无法确认的请求写成 0。launcher 的 worker-failed 兜底也有同类风险。

这不授权重试，也不说明已经发生真实请求；它只是 R1 运行前必须消除的审计不诚实。

## 唯一授权修正

沿用现有 worktree、分支和 Draft PR #109。不得新建 worktree、分支、实现 PR 或真实批次。

只允许修改 `scripts/nv-dream-climate-offline-01/phase-b/` 的计数/回执路径、对应定向测试和验证文档：

1. 在真正调用 live transport 前后维护单调、进程内的实际计数：
   - `networkAttempts`：每次准备向 `https.request` 发起一次真实请求时增加；
   - `realModelRequests`：同一固定批次中实际交给 live provider transport 的请求次数。
2. preflight、dummy、凭据供应前拒绝继续精确报告 0。
3. 凭据供应后、live transport 尚未调用时仍可精确报告 0。
4. live transport 已调用后发生普通失败，回执必须报告实际正整数，并保留对应 ledger row 为 settled 或 unknown；不得回写 0。
5. 若 worker/父进程在已经供应凭据后异常终止，父进程无法证明是否已 dispatch，则相关字段必须报告显式 `unknown`/nullable 不确定状态，并附 `requestOutcomeKnown:false`；不得假装为 0。
6. 成功批次报告实际 12/12；部分批次报告实际次数。任何失败都不重试、不替代、不启动下一场以外的额外 run。
7. `credentialSupplierCalls`、Store 是否创建、release 是否撤销、owner.lock 是否清除仍如实报告；不得为了计数修正放宽 secure-input、identity、price、Store 或预算门禁。
8. 若实现需要把计数器放入 live transport wrapper，可新增只在 Phase B 内使用的 telemetry object；不得打印 Key、请求 Authorization 或响应正文。
9. 重新生成 live identity。若执行 blob 改变则 live identityHash 必须改变；release object 若未改变，releaseHash 可以保持，但必须重新验证。prompt、source、offline identity、matrix、价格、Store、12-call/0.48-CNY、三气候顺序不得改变。
10. 不修改五个离线执行 blobs、fixture、protocol prompt、共享 `src/`、#107 历史或任何 Store。

## R2 定向证明

至少新增以下测试：

- preflight 和凭据前失败：`networkAttempts=0`、`realModelRequests=0`、outcome known；
- credential 已供应但 transport 未调用：仍为精确 0；
- 模拟 live provider 在第一次 dispatch 后失败：两个计数均为 1，对应账务为 unknown/settled 中的真实状态，不能是零；
- 两次成功后第三次失败：计数为 3，不重试，后续不新增调用；
- 模拟 child/worker 在 credential 供应后不可解析或异常退出：launcher 报 `unknown` 与 `requestOutcomeKnown:false`，不能报 0；
- dummy 排练继续为网络 0，12 个 fake calls 不冒充 realModelRequests；
- 成功 fake live transport 的实际 dispatch 计数与 ledger 行数一致；
- secure-input 仍只提示一次 Key，release 最终撤销，owner.lock 清除；
- 旧付费入口继续失败关闭。

重跑：

- 更新后的 Phase B 定向测试；
- 原 #109 11 项专项；
-相关 51 项最小回归；
- admission/dummy/checker；
- `git diff --check`。

共享 `src/` 仍禁止修改，因此无需完整 npm 测试。任何真实 Key、真实 Store、真实模型、网络请求或费用仍禁止。

## R2 交付终点

提交并推送同一 PR #109 后，只回执：

- 新 HEAD/tree/parent；
- changed files；
- 新 live identityHash，release/matrix/price hash 是否保持；
- 新增失败路径测试实数；
- preflight/dummy 零网络证明；
- 唯一 secure-input 命令（仅展示，不运行）；
- PR Draft/open/base/head/mergeable。

状态只允许：

- `READY_FOR_USER_SECURE_INPUT_R2`
- `BLOCKED`
- `TOTAL_CONTROL_DECISION_REQUIRED`

达到后立即停止。不得运行真实批次、提示或读取 Key、创建真实 Store、ready、合并、部署或开启下一包。

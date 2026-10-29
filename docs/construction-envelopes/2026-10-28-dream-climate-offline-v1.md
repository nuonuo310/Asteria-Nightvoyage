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


---

# R3 · 已发生失败后的离线诊断与账务分离

本节是当前唯一施工授权，取代 R1/R2 的待运行授权。一次真实批次已经发生并停止；不得恢复、补跑或复用其 release。沿用同一 worktree、分支与 Draft PR #109。

## 固定输入与事实

- 实现起点：`9c2137304471ab554cb95d52374e10521e2f4272`
- tree：`eeef65e184715aa1176f6f81351eae76ea65d1b5`
- live identity：`54393cfd54ebef8d86afbb2922cc3ab0d8a2657ccf690b695691ac4ddb3528d3`
- A run：三幕 draft 已保存，wake 被归类为 invalid_wake；4 次 dispatch；前三笔 settled 合计 11770 micro-CNY，第四笔 unknown 占用 35968，总账面占用 47738。
- B/C queued，零调用；原始 wake 返回未持久化，具体失败字段不可追溯。不得把新 fake 复现写成原失败根因。
- 真实 state.json：13399 bytes，SHA-256 `6d4ef8916c5610a4afd940ed2919c64f25915e4ba96842dfb02bc3f048f16754`。本轮无需重新读取它；绝不改写或重新结算历史。
- 本次三幕证明画面、连续变化与梦内变形有所改善；三幕 unchanged 不足以判定情绪错误。车票成为共同主轴是内容观察，尚不证明批次差异（B/C 未跑）。

## DONE LINE

只在临时 synthetic Store 中证明：未来响应验证失败时保留明确的验证子原因；已验证的 usage 可以独立于内容发布结算；失败梦仍不发布，后续 run 停止，真实运行入口关闭。完成后交回人工离线评审，不输出新的输 Key 指令。

## 允许范围与冻结项

允许修改本包 phase-b 诊断、运行账务分离、回执、identity、入口关闭逻辑；新增对应测试及 docs/validation/dream-climate-live-r3.md。同步本权威文件副本。沿用既有分支提交并普通推送至 #109；不新建任务/分支/worktree/PR。

共享 src、五个离线执行文件、prompt、source、fixture、matrix、价格、预算、所有真实 Store 与旧账冻结。本轮不改情绪规则或素材提示，不逼出 estimated、不强制非零 delta，不声称修好了未知的历史 wake 内容。内容候选是否需要进一步改动留给实际证据；不自动续包。

## 实现要求

1. **先关闭真实入口**：R3 是离线候选，secure-input / launcher 的真实 run 路径在提示或供应 Key、创建真实 Store、网络之前明确拒绝（例如 OFFLINE_REVIEW_REQUIRED_R3）。旧 R1 release 即使字节完全正确，也不得启用 R3 live。不得创建新真实 release、扩大预算或移除已存在 Store 防重跑检查。允许通过测试专用注入运行 synthetic runtime；不得暴露 CLI/env 绕过开关。
2. **分开验证与发布**：保留原 normalization 的严格语义及原始错误码，并另存稳定字段分类（response/fragment/associations/residue/firstFeeling 等）。generic invalid_wake 可保留兼容，但回执须显示具体原因。不得静默修补、截断为合法输出、丢弃无效 firstFeeling 后发布，或放宽逐字摘录。
3. **限量诊断**：仅为新 synthetic/未来另行获准的执行提供版本化诊断记录，包含 run/request/stage、原始验证错误码、响应可用性、usage 验证状态。可保留限长的模型 content 文本或解析后 JSON 诊断副本，明确 rejected/non-published；总大小设置硬上限（不超过 16 KiB/次），超界只记录省略原因与长度，不截成可接受梦。只允许模型 content，不保存请求头、Authorization、Key、环境、完整 HTTP envelope 或任意异常对象/堆栈。沿用 transport 的 credential echo 拒绝，并测试含凭据的返回不进入持久诊断。合成标记、现实素材不得混进用户梦簿。
4. **账务与内容有效性分开**：先阅读 BudgetLedger.settle 的事务语义。仅当 provider usage 已通过现有模型/范围/预算/价格校验时，内容 invalid 仍可用该 receipt 完成一次结算，但不发布 dream/wake/feeling/residue。结算成功后诊断或内容失败不得再改写为 unknown；结算失败、usage 缺失/不可验证、传输不确定或持久化不确定继续保守 unknown。禁止直接改 ledger 私有结构或绕过校验。共享 src 如不足以支持，STOP 说明具体原因，不复制或扩大其契约。
5. **费用标签诚实**：回执区分 settled 计算费用、unknown 保留占用、二者合计；保留兼容字段时解释其含义，不能把合计标作 provider 已确认实扣。旧第四笔不能凭新代码补造 usage 或追溯 settled。
6. **状态和内容保护**：失败后三幕 draft 保留并可在诊断阅读面完整提取，明确未发布；无 wake/feeling/residue 时报告未记录，不推断心情。成功路径仍原子发布完整梦，发布失败不会留下半套记录；任意失败后不得启动 B/C、重试或替代 run。
7. 更新候选执行 identity，保留旧身份作为历史证据。离线入口关闭属于新身份，不得调整旧 release 使之可用。不要为了检查新身份打开真实 Store。

## 最小验证

使用明确标记 fake 的新 fixture，不编造本次真实 wake：

- 合法 wake：原子发布、逐字 fragment、四态 firstFeeling，usage settled。
- 分别测试额外字段、错误 firstFeeling、非法 residue/associations、非逐字 fragment：精确子原因；三幕 draft 保留；无正式发布；已验证 usage settled 一次；后续零调用。
- usage 缺失/越界与传输失败：保持 unknown，无伪造费用。
- 结算成功后诊断写入失败，以及发布/持久化失败：事务状态诚实，不重复结算或覆盖成功账务；若无法保证，STOP。
- 超长或含 dummy credential 的响应不泄露凭据、不形成可发布截断文本。
- R2 dispatch 计数与 child unknown 语义继续成立。
- 新真实入口在旧 release 存在/不存在时均零 credential supplier、零真实网络、零真实 Store。
- 运行受影响的 Phase B 定向、11 项离线专项与 51 项相关回归、旧付费失败关闭检查、git diff --check。无需全套 npm 或截图；不反复跑无关测试。
- 测试不得依赖真实 Key、实际专用 Store 或真实 provider；可用 fake clock 和合成价格校验输入，明确不是重新核验官方价格。

## 交付与停止

回执列 HEAD/tree/parent、改动文件、新 identity、具体测试与首次失败、一次“格式错误但已知 usage”的完整 synthetic 例子，以及零真实调用证明。PR 描述更新为当前离线候选状态，保留历史证据链接。

终点仅为 READY_FOR_HUMAN_OFFLINE_REVIEW_R3、BLOCKED 或 TOTAL_CONTROL_DECISION_REQUIRED。禁止 READY_FOR_USER_SECURE_INPUT，禁止真实执行、ready、合并、部署或下一包。若起点漂移/同包正在施工，先回执，不覆盖。


---

# R4 · 单场完整梦准备与一次人工触发验证

本节为当前施工授权。用户同意继续一次单场验证；施工端本轮仅离线准备，完成后交总控审核，不能自行运行模型或提示 Key。沿用同一 worktree、分支、Draft PR #109，不另开施工任务或 PR。

## 固定起点

- HEAD：`de14f237d26b7ee82d5be7196162d661a6291b28`
- tree：`5435202edc9ca444385609d867294d75a882e1e2`
- R3 identity：`aff0b17e450c561908589a68ae2306be7a694c4faf9b044782286ea50a36e3f1`
- 权威历史 R3：`40cf8e998abdccdaa2ce10fbae1f425a4fe0c10e`

先阅读适用 AGENTS.md、本包及相关参考。若已有同包施工运行，停止重复启动；起点漂移先报告，不 reset 用户改动。

## 固定范围

一次新 run，三幕 scene + 一次 wake，最多 4 calls，每次 max_tokens=400，请求体最多 16384 UTF-8 bytes。固定 ordinary / transformation / cup_tap，两个 used ledger 均为空。使用同一 source、prompt、严格 normalization；不改情绪规则、不给 estimated 或非零 delta 配额、不提高剧情强度、不改素材分配规则。

这是新单场验证，不是继续旧批次或修复旧梦。旧三幕、unknown 账务、B/C queued 和历史身份均保持原样；禁止读取/打开/迁移旧真实 Store。

新专用目录逐字为：
`C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r4-01`
新 runId：`nv-dream-climate-one-dream-r4-a`
新 allowanceId：`nv-dream-climate-one-dream-r4-001`
新 release/identity/请求 ID 必须与旧批次隔离。目录必须在提示凭据前确认不存在，存在即拒绝，不能删除后重来。没有 B/C 占位或第五次调用。

按原已审查高峰价格输入 2 CNY / 1M、输出 8 CNY / 1M，单 call 保留 35968 micro-CNY，四次最坏 143872，硬上限 160000 micro-CNY（0.16 CNY）。这些是预算参数，不代表本轮已重新核验价格。施工端只读核对官方价格页和已保存 HTML：若可核实价格与模型相符，记录来源、时间和 SHA；无法核实则可完成离线实现，但明确 PRICE_REVIEW_PENDING，不能声称 ready for secure input。价格变化不得自行加预算。

## 实现方式

允许本包内新增专用 `single-run-r4/` 适配器/配置/secure-input/identity，及必要的 phase-b 可复用逻辑重构、测试、验证文档。优先复用 R3 runtime/records/diagnostics/transport；若需将 run 列表、目录、allowance 提取为内部显式 profile，限于固定 R3 synthetic 与 R4 两个 profile，不暴露任意 CLI/env 配置，不绕过共享 ledger 校验。五个离线执行文件、共享 src、source/prompt/fixtures、旧价格/身份文档保持不变。

旧 phase-b secure-input/launcher/worker 继续返回 OFFLINE_REVIEW_REQUIRED_R3。只能新增精确绑定 R4 的入口；旧 release 无法打开 R4，R4 release 无法打开旧入口。新执行 identity 覆盖实际运行文件、profile、source/prompt、模型参数、价格证据、四次/0.16 元上限、专用目录与无重试规则。不得把旧身份记录覆盖成新值。

R4 入口必须：
1. 无 release、价格未核实、身份漂移、Store 存在或路径不符时，在询问/供应 Key、创建 Store 或网络前拒绝。
2. 先完成无凭据 admission 与 dummy 排练，再由用户在普通 PowerShell 主动运行 secure-input，只提示一次私密 Key，经现有管道供应，不读环境 Key/凭据库/剪贴板/Key 文件，不持久化凭据。
3. 新 release 精确绑定 R4 全部约束、identity；准备阶段不遗留可用 release。一次触发结束即撤销，异常/失败不重试，不增补或替换 run。
4. 保留 R2 已发起计数与子进程崩溃 unknown 语义，不能退回硬编码零。
5. 继承 R3 具体验证错误、限量诊断、已验证 usage 独立结算和原子内容发布。原始 JSON 解析失败可报告内容未保留与原因，不宣称所有失败都有完整正文。
6. 在 transport 序列化原文与解析后的模型 content 中检查凭据回显，覆盖 JSON Unicode 转义后才显现的 dummy Key；拒绝回显后不能把内容持久化为诊断。只保存模型内容或受限解析副本，不保存 headers/Authorization/凭据/任意异常对象。
7. 成功与失败均输出可复制的完整回执；失败保留全部 draft 原文，未发布字段明确未记录；成功分开原梦、逐字 fragment、独立四态 firstFeeling、simulated residue、未记录的后来回想。技术模型名仅审计显示。
8. 费用列 settled 计算额、unknown 占用、合计和实际调用数，不把合计称 provider 已确认实扣。

## 必要离线验证

- 一场成功恰好四次，三幕加 wake 完整保存；present/absent/uncertain/omitted 均合法。
- 三幕后 wake 无效：精确子原因、完整 draft、有效 usage settled、无正式梦/余韵、无重试。
- 缺失/非法 usage、请求失败、结算后诊断写入失败、发布失败继续保持 R3 账务语义。
- 第五次、第二场、同 run 重启、目录已存在、旧 release、identity 漂移均拒绝。
- admission supplier=0；dummy 不访问真实目录；真实入口只经用户 secure-input。
- 凭据前错误为精确零，dispatch 后实际数，child 交付凭据后崩溃为 unknown。
- 原文与 Unicode 转义 dummy credential 回显均不进入 Store/回执。
- 新 R4 专项、受影响 R1/R2/R3 专项、11 项离线及 51 项回归、旧付费关闭检查与 diff --check。不跑全套 npm/截图；不访问真实 Store/Key/模型。已有测试仅因入口结构变化可调整断言，不削弱真实状态证明。

## 交付与停点

提交并普通推送同一 #109；更新 PR 描述为当前状态，使用 UTF-8，修复现有中文问号乱码，保留历史证据链接。回执：
HEAD/tree/parent、新 identity/release/matrix/price 身份、请求大小实数、四次/0.16 元上限、官方价格核实状态、实际测试、零真实调用证明；展示唯一新 secure-input 命令但不运行。

本轮终点：
- READY_FOR_TOTAL_CONTROL_REVIEW_R4（离线准备与价格证据齐备，等待总控审阅）
- PRICE_REVIEW_PENDING（离线实现完成但价格证据未核实）
- BLOCKED / TOTAL_CONTROL_DECISION_REQUIRED

不得自行提示 Key 或执行真实批次。总控审阅通过并向用户交付新命令后，才允许用户主动触发一次。真实结果无论好坏完整保留；不自动二次尝试、ready、合并、部署或开下一包。旧 V1 结论不变；单场通过也不代表三气候或长期稳定性验收通过。


---

# R5 · associations 明确类型与中文输出离线修正

本节为当前唯一施工授权。R4 真实单场已经执行并失败；原运行授权结束。本轮只离线修正和只读取证，不得再提示 Key、创建可用 release、运行真实模型、恢复或补跑旧 run。

## 固定起点与事实

沿用既有 worktree、分支和 Draft PR #109，固定实现起点：
48be3aad209db57cf125e69e84b1276cc3177efb。
先读取适用 AGENTS.md 与本权威全文，确认没有同包任务运行；漂移先报告，不覆盖用户改动。

R4 run nv-dream-climate-one-dream-r4-a 三幕 draft 已保留；wake 错误为 invalid_generated_wake_associations，稳定分类 associations。诊断明确显示 associations 返回了 [{question:字符串}]，而现有 normalizer 只接受零或一个非空字符串的数组。四笔均 settled，计算额合计 15690 micro-CNY，unknown 为 0；没有正式 dream/wake/feeling/residue。诊断内 firstFeeling uncertain、residue 0.08 仅为拒绝响应内容，不是正式记录。

用户粘贴的输出中文乱码，甚至出现 JSON 引号损坏。只能确认输出副本损坏，不能据此认定 Store 损坏。提示未明确字符串元素类型是已观察的协议说明缺口；不能证明模型选择对象形状的唯一因果，也不能追认更早一次 invalid_wake 的原因。

## DONE LINE

在零模型、零费用条件下完成：
- wake 请求明确 associations 的字符串数组形状，现有严格校验不变；
- Node → PowerShell → 人类可读回执的 UTF-8 往返有真实离线证据；
- R4 真实三幕与拒绝响应以只读方式核对，若 Store 中文完好则完整呈现其原文；
- 原失败 run 与账务原样保留，新候选真实入口关闭；
- 提交同一 #109 后停止在 READY_FOR_HUMAN_OFFLINE_REVIEW_R5。

## 唯一内容协议改动

允许修改 scripts/nv-dream-climate-offline-01/protocol.mjs 的 wake associations 类型说明：明确 associations 必须是 JSON array，长度为 0 或 1；元素必须为非空字符串，禁止 question 对象、null、裸字符串及第二个元素。给出无剧情占位的两种结构 [] 与 ["<one unverified question>"]，两种均合法、无首选。不得把某个固定问题写成模型默认输出。

不放宽 normalization，不将对象自动提取 question，不修补或重放真实失败响应，不修改 firstFeeling 四态、fragment 逐字要求、residue、情绪规则、源素材、气候、机制、主意象或 scene 提示。不得宣称离线测试证明真实模型必然遵循新提示。

这明确解除此前对该文件上述 wake 说明的冻结；其它内容仍冻结。prompt 与候选 identity 必须变更。允许更新本包相关 manifest 和一致性引用以反映新候选，但旧提交、历史回执和旧身份证据不可改写。新身份不得让任何旧 release 重新可用。共享 src 不修改。

## 中文取证与输出修正

允许仅对下述文件进行一次只读取证：
C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r4-01\state.json

只能通过内建 fs.readFileSync + JSON.parse，严格 UTF-8 解码；不得实例化 Store/runtime 或执行应用入口。读取前后核对字节数与 SHA-256，检查锁文件存在性但不得修改。只提取目标 run 的 draftScenes、wake 拒绝诊断和四笔账务；不读 Key、凭据库、环境变量内容、历史或其它 Store。不做乱码猜测逆转换，不覆盖原文。

检查并修正 single-run-r4/secure-input.ps1 的 ProcessStartInfo 标准输出/错误编码与最终输出编码；保留管道私密输入语义，不改用户全局终端设置。若需要编码 helper，应可独立用无凭据 stub 运行。用实际 Windows PowerShell 与 Node stub 测试中文、引号、换行、非 BMP 字符的 JSON 往返，解析后逐字一致；不能只搜索脚本文本作为证明。若控制台复制仍受外部设置影响，可导出本次只读提取的 UTF-8 文件到同一 worktree 的 docs/validation/，清楚标记未发布/拒绝诊断，禁止导出全 Store 或凭据。

若 Store 原文正常，报告乱码位于输出链路的证据；若 Store 本身乱码，报告事实与未能定位的环节，不写回、不猜修，不扩大真实调用。

允许在 docs/validation/dream-climate-live-r5.md 保存目标 run 的完整三幕和拒绝 wake（均标记真实模型生成、未发布、虚构非现实事实），保留精确内容，不润色；文件用于审阅，不冒充已完成梦簿。

## 入口与范围

先将 R4 secure-input/worker 的真实路径关闭为 OFFLINE_REVIEW_REQUIRED_R5，在读取凭据、写 release、创建真实 Store 或发网络请求之前拒绝。编码 helper 可供 stub 验证；真实入口关闭不得妨碍纯离线排练。旧 R3 入口继续关闭。

允许本包 protocol 的上述小改、相关 identity/配置的一致性修正、single-run-r4 编码 helper/入口关闭、专项测试、验证文档及权威副本。保持同一 worktree/分支/PR。不得修改真实 Store/旧账/历史回执、共享 src、页面、Memory/Mind，不另开包、PR 或自动申请下一场。

## 验证与交付

必要测试：
1. []、单字符串数组被接受；对象数组、null、裸字符串、两个元素被拒绝，保留 associations 子原因；四态 firstFeeling 仍合法。
2. 实际 builder 发出的 wake system 包含明确元素类型，scene system 与 source 未变；新 prompt/identity 正确，旧 release 拒绝。
3. synthetic 错误对象数组：三幕保留、有效 usage settled 一次、无正式发布、无重试；不得用真实失败数据的转换结果冒充修复成功。
4. 实际 PowerShell/Node stub UTF-8 往返，中文及非 BMP 内容逐字一致。
5. R4 真实入口无凭据、无真实 Store 创建、无网络；只读取证哈希前后一致。
6. 受影响专项与必要 scene/wake 回归、旧入口失败关闭、git diff --check；不要求完整 npm 或截图，不重复无关测试。

修复 PR 描述 UTF-8 问号乱码；若本地缺少元数据编辑能力，报告并由总控处理，不因此扩大凭据访问。普通提交推送同一 #109，保持 Draft。回执给出 HEAD/tree/parent、新 prompt/identity、实际测试、只读哈希、完整可读原文，以及“协议说明修正”和“历史失败未改写”的明确区别。

终点仅 READY_FOR_HUMAN_OFFLINE_REVIEW_R5、BLOCKED 或 TOTAL_CONTROL_DECISION_REQUIRED。不得给用户输 Key 命令，不得真实试跑、ready、合并、部署或自动续包。


---

# R6 · R5 修正后一次单场闭环准备

当前唯一授权：沿用 #109，同一 worktree/分支，准备一次新单场。施工端仅离线实施，交总控审核后才由用户主动输入 Key 触发。不得自行执行或反复尝试。

固定实现起点 c4680ad1065c7b8c8c4cbf57ba90d24d04d175b6，tree b178f3ff6772842af210e3bac71206bbc5e13bb0。先读适用 AGENTS.md、本包与参考；若同包已在运行或起点漂移，停止重复启动，不覆盖。

## 冻结内容与运行范围

冻结 R5 promptHash 9fe4d0863983eae2eb8a969d89fd6ffc5eeab3ebec507bf263d0f27664fbdb66、sourceHash 605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6、严格 normalization、scene/affect 规则、four-state firstFeeling、逐字 fragment 和独立 simulated residue。不得加入新剧情、强迫情绪变化或进一步修改 prompt。

新 profile：r6。固定 ordinary / transformation / cup_tap，used ledger 均空。
新 runId：nv-dream-climate-one-dream-r6-a
新 allowanceId：nv-dream-climate-one-dream-r6-001
新专用目录：
C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r6-01

一场、三幕加一次 wake、最多 4 calls，max_tokens=400，请求体上限 16384 UTF-8 bytes。沿用每 call 保留 35968 micro-CNY，四次最坏 143872，硬上限 160000（0.16 元）。不得扩大。预算价格是此前审查参数；只读复核官方证据，若无法确认仍适用则 PRICE_REVIEW_PENDING，不自行标记 ready 或加预算。

禁止打开/修改任何旧真实 Store 或把 R4 draft 作为新场景。历史 R4 是失败的一场，四笔 settled 计算额 15690；其 rejected wake 不得追认为正式记录。所有旧入口继续关闭，不用旧 release。

## 最小实现

允许新增本包 single-run-r6/ 的薄适配器、profile、配置、manifest、release、secure-input/worker 与测试回执。复用现有 runtime/records/diagnostics/transport、R5 UTF-8 helper；允许必要的内部固定 profile 接线，不复制整套生成引擎，不暴露任意 CLI/env profile/预算/Store 绕过接口。共享 src、五个离线执行文件和旧验证文档冻结。

身份必须覆盖全部实际执行依赖、模型参数、prompt/source、固定 profile、价格、目录、四次/0.16 元与无重试规则；记录所有随接线变更的候选 identity，不改写历史身份。新 release 显式固定已审查执行 manifest 摘要或等价的不可自更新执行 pin；不能仅比较可随代码一同重生成的当前 identity。避免自引用：将 release/manifest 的固定 pin 设计清楚，必要时采用单独 execution digest；测试代码与 manifest 一起漂移仍不能通过旧批准。

secure-input 保留 R4 的流程：无凭据 admission → 临时 release → worker 静态检查通过的 credential_required → 唯一一次私密 Key 输入。目录存在即拒绝，不能删除后重跑。价格/身份/目录检查全部在 Key 提示前完成。临时 release 在完成和错误路径撤销。无命令行明文 Key、环境凭据、凭据库或剪贴板读取。

将 R5 已验证的严格 UTF-8 捕获真正接入新的 worker stdout/stderr 和用户结果输出，不只保留孤立 stub。成功/失败回执均应有可读取的 UTF-8 文件，文件位于新专用目录中的独立 receipt 文件（如 receipt.json），只包含审阅所需内容，不导出 Key/headers/全 Store；禁止覆盖既有文件。回执写入失败如实报告，不重新请求模型或撤销已结算账务。

继续精确调用计数；交付凭据后 child 崩溃或输出无法解析时返回 unknown/null，不报零，即使 child exit 0 但结果缺失/不可解析也要处理。凭据回显拦截、限量诊断、已验证 usage 独立结算、完整梦原子发布、失败 draft 保留均复用。第一处失败就停，无第二场、第五次、重试或替代。

## 有限离线验收

使用临时 synthetic Store 与 dummy credential：
- 一场四次成功，四态 firstFeeling 合法，逐字 fragment、独立 residue、后来回想为空。
- associations 对象数组严格拒绝，精确子原因、三幕 draft 保留、有效 usage settled、不发布、不重试；字符串数组成功。
- usage 未知、网络失败、持久化/发布失败保持既有诚实账务与计数。
- 旧 release、manifest 漂移、代码+manifest 同步漂移、Store 已存在、第五次/第二场均拒绝。
- 实际 Windows PowerShell 调用新的捕获路径与 fake worker，验证中文/非 BMP/JSON 引号/换行和最终 receipt.json 字节；child 正常无结果、错误退出与无法解析输出均有确定状态，零真实网络。
- admission 不提示 Key、不供应凭据、不创建真实 Store；准备阶段无 release 遗留。
运行新专项和受影响的既有专项/必要回归、旧入口拒绝、diff --check；已通过的无关检查不反复跑。无需全套 npm 或截图。

## 交付终点

普通提交推送同一 #109，Draft 保持，正文 UTF-8 更新并保留历史证据。回执必须完整提供 HEAD/tree/parent、新 execution/identity/release hash、价格核实来源与时间、request bytes、预算、测试命令与实数，以及唯一新 secure-input 命令（仅展示）。
本轮只到 READY_FOR_TOTAL_CONTROL_REVIEW_R6、PRICE_REVIEW_PENDING、BLOCKED 或 TOTAL_CONTROL_DECISION_REQUIRED。

总控审阅实际实现后才向用户交付一次新命令。一次真实执行结果完整保留，不挑选、不自动续批。若仍失败，依据具体诊断再裁决，禁止自动以“修好了”为由反复充值调用。此次通过仅证明单场闭环，不代表三气候/长期质量或整个 V1 自动验收。不得 ready、合并、部署、接 Memory/Mind 或另开下一包。

---

# R7 · 同幕证据边界离线澄清

本修订只授权离线修正，覆盖此前尚未执行的 live 指令；不授权任何真实调用、重试或新的 release。沿用原 worktree、分支及 Draft PR #109；不得新开施工包、worktree 或 PR。

## 固定起点与事实

- 实现起点：`5885ebf8f7a73f53fd471e1680d21b9f6a457945`，tree `cb675f41419616d8559402196123ebb0ed18c461`。
- R6 run：`nv-dream-climate-one-dream-r6-a`。用户提供的回执显示两幕 draft、第三幕被拒，错误 `scene_response_rejected / invalid_compact_evidence`；未执行 wake，未发布 dream/firstFeeling/residue。
- 第三幕 basis.uncertainty 为“日期被水汽洇得看不清了”，该句逐字存在于第二幕，但不在第三幕 event 内。这是明确的跨幕引用现象；必须通过实际 normalization 离线复现，不能只凭诊断名称断言它是唯一原因。
- 三次真实调用均 settled，计算金额 12384 micro-CNY，unknown 保留为 0；不是 provider 实扣确认。历史 receipt SHA-256（回执声明）：`1c90693fb832fa62b4c6d908955e6b3963984059dd46324930195826fae5e4ae`。
- 现有 sceneRules 已要求同幕逐字引用。因此本轮是对既有规则的针对性澄清，不得写成“过去没有同幕规则”，更不能宣称提示修正能保证真实成功率。

## 最小施工范围

1. 在 `scripts/nv-dream-climate-offline-01/protocol.mjs` 的 sceneRules 内明确：previousScenes 仅提供叙事连续性和历史状态；本次 basis.goal 的两个引文、basis.control、basis.uncertainty、estimated affect.excerpt 必须逐字来自本次返回的 event，不能仅来自 previousScenes/source。wake 的跨幕逐字摘录规则保持不变。
2. 要求在返回前核对这些引文是否存在于当前 event，不输出核对过程。当前幕无证据时按既有 null/UNKNOWN、goalEffect 和 unchanged 规则表达；不强迫非零情绪，也不强迫 neutral/unchanged。不为满足引文校验机械重写旧句到新幕。
3. 严禁运行时自动替换引文、复制前幕正文、改写模型数值、丢弃非法字段、放宽 parser 或添加修复调用。共享 src、normalization、wake 提示、固定 source、fixtures、气候/机制/情绪语义、预算与价格均冻结。
4. 只新增专项测试与 R7 验证文档；允许同步本权威副本及更新受实际改动影响的候选 identity manifest。旧 R6 真实入口必须在凭据、Store、网络前失败关闭；允许最小离线关闭保护及对应测试。不得为新源码生成可执行 live release，不刷新批准 pin 来继续使用 R6 许可；R1–R6 历史身份与回执保持原义。
5. 不重读真实 Store/Key、不要求用户再次执行 secure-input。离线复现材料优先取已有本地 R6 receipt 的已交付副本；若副本没有第三幕正文，使用下述精确被拒对象即可，不进入真实 Store。只将最小失败对象作为“历史被拒响应”加入新测试，不修改旧 fixtures。

## 精确被拒对象（历史模型响应，虚构，未发布）

```json
{"event":"铁皮盒的盖子被搁到长凳另一头，盒口朝上，那张洇湿的票根还贴在盒底。梦里的人伸指沿着盒沿走了一圈，走到缺口处停住，又轻轻敲了两下。声音闷在薄铁里，像从很远的地方传回来。旁边另一个人没有接话，只把盒盖拿起来，对着剩余的天光看了一会儿，然后把它翻扣在盒口上，像一杯凉透的茶被合了盖。小街的积水暗下去，早点摊的板凳腿在湿地上挪出轻轻一声。","appraisal":{"goalEffect":0,"control":0.4,"uncertainty":0.6},"basis":{"goal":null,"control":"把它翻扣在盒口上","uncertainty":"日期被水汽洇得看不清了"},"affect":{"kind":"estimated","delta":{"valence":0,"arousal":-0.1},"excerpt":"声音闷在薄铁里，像从很远的地方传回来"}}
```

输入 before 为 `{"valence":0,"arousal":0.1}`。前幕含“日期被水汽洇得看不清了”；只作为测试上下文，不能被当前幕 normalization 当作证据。

## 有限验证与结束线

- 用真实 normalization 重现上述对象被拒；单独构造合规对照（例如仅将 uncertainty 引文换成本幕的精确片段），明确标记人工测试变体，不覆盖历史响应、不声称语义成立。
- 表驱动覆盖 goal 的两处引文、control、uncertainty、affect.excerpt 的跨幕引用均不能通过；合法同幕引文、合法无证据分支保持原行为。
- 经实际 builder 验证三个 scene 阶段均携带澄清、前幕仍完整传递、wake system 保持逐字不变；新增文字进入 prompt identity。
- fake transport 复现第三幕失败后停止：两幕草稿保留，第三次有效 usage 结算一次，wake 调用为 0、发布为 0、无重试。无需新建诊断系统。
- 运行 R7 专项、受影响 R6/scene/wake 最小回归、旧付费失败关闭检查、diff --check。共享 src 未变则不要求全套测试；已有通过的无关检查不反复重跑。
- 如实列命令、实数、首次失败及修正、changed files、新旧 prompt/identity、真实网络/模型/Key/Store访问为零；测试只证明结构与处理路径，不证明模型服从率或文学/情绪质量。

完成后普通推送同一分支，PR #109 保持 Draft；更新 PR 描述为 R7 离线候选并保留历史链接（如本机不具备工具，回执说明，由总控处理）。最终状态 `READY_FOR_HUMAN_OFFLINE_REVIEW_R7`。到此停止，不自动开启 R8、真实试跑、ready、合并或部署。


---

# R8 · R7 候选单场验证准备

2026-10-29 总控接续裁决：R7 有限离线修正已接受。恢复同一施工任务，准备一次新的单场内容验证；本轮施工只到可审阅的离线交付，不执行真实调用。不是恢复 R6，也不重签旧许可。已有同任务施工在跑则不重复启动。

## 固定输入与唯一目标

- 原 worktree：`C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01`。
- 原分支 `codex/nightvoyage-dream-climate-offline-01`、Draft PR #109，base 不变。
- 固定实现 HEAD `a99341ea31f25fa67df968e46f8eb45159f0fa75`，tree `2c3f5a172433b6b3ef1e3eadbb08d80e339a05df`，parent `5885ebf8f7a73f53fd471e1680d21b9f6a457945`。
- 冻结 R7 promptHash `89b1d4a87d53f41b697341dd32fb4bb3ad41b665e2a47b68a3d5e5464cbf3c38`、offline identityHash `e574d505ca4ce104507af00b19f72f63c99658d65cab1918ff6c3ad903e2287a`、sourceHash `605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6`。
- 唯一目标：准备一场 R7 协议的三幕加 wake，完成后可直接审阅原梦、梦中情绪、逐字醒来残片、firstFeeling 四态及独立模拟 residue；后来回想为空。不增加内容规则、语义评分、题材或 Memory/Mind。

## 固定运行配置

- profile：r8；runId：`nv-dream-climate-one-dream-r8-a`；allowanceId：`nv-dream-climate-one-dream-r8-001`。
- 专用 Store：`C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r8-01`。
- matrix：ordinary / transformation / cup_tap；两个 used ledger 均为空。
- 一场，3 scene + 1 wake，最多 4 calls，无重试、无替代场、无第二场或第五次调用。
- 每请求上限 16384 UTF-8 bytes，max_tokens=400；预算硬上限 160000 micro-CNY（0.16 元）。
- 35968 micro-CNY/次、143872/四次是此前审查价格下的预留，不冒称今日新价格。准备阶段允许只访问官方公开价格页核对模型及价格并保存新证据；不调用 provider 生成接口、不读取余额或凭据。价格仍一致才沿用上述预留；不一致或不可确认则 PRICE_REVIEW_PENDING，不自行加预算或换模型。公开价格核对网络与模型网络分开报告。

## 最小实现与旧历史

新增 `scripts/nv-dream-climate-offline-01/single-run-r8/` 的固定接线，复用既有 Phase B runtime/records/diagnostics/transport 与已验证 UTF-8 捕获代码。只允许为独立 r8 配置所需的薄适配器，不复制第二套生成/结算引擎，不做通用配置框架或大型重构。旧 R6 脚本中的硬编码不能直接继承为新身份：run/Store/profile/prompt/首请求长度必须对应实际 R8。

冻结共享 src、protocol.mjs、source、fixtures、情绪语义、wake schema、旧 R1–R7 回执和旧批准 pin。旧入口继续关闭，不读写旧真实 Store，不把旧 draft/被拒响应补发布为新梦。新目录已存在即拒绝，不删除以便重跑。

沿用 R6 的凭据前检查、固定执行 pin、独立结算与原子发布、限量拒绝诊断、真实调用计数及 UTF-8 receipt 文件机制。新 identity 覆盖实际执行依赖和固定配置；生成新批准摘要候选，不能仅依赖可自动重生成的 manifest。不生成遗留的可执行 release.json；secure-input 仅在用户主动执行后临时建立并最终撤销。PowerShell 从唯一 release 对象取得批准 digest，避免重新引入未定义变量或重复常量。

成功与失败回执必须包含原文或已保留的 draft/拒绝响应、准确发布状态、结算/unknown 分列，文件独占写入、不覆盖。凭据交付后无结果/错误/不可解析仍按未知计数处理，不报零；不得为回执失败再次请求模型。

## 有限验证

只跑新适配器相关与直接受影响测试：
1. 使用 R7 实际 builder 和 normalization 的 synthetic 四次成功闭环；完整独立记录及后来回想为空。
2. R7 同幕证据专项继续通过；第三幕跨幕引文失败与 wake associations 对象数组失败，均停止、保留 draft、有效 usage 恰一次 settled、不发布、不重试。
3. 新旧 release 不混用，代码与 manifest 同步漂移仍被固定 pin 拒绝；目录已存在、第二场、第五次拒绝。
4. 实际 Windows PowerShell 的真实新 secure-input 入口以无凭据 stub 跑到 worker preflight，分别验证批准摘要匹配与不匹配，不只测试 helper。首请求 bytes 从实际 R7 请求取得，不能沿用 R6 的 4855 常量。
5. 实际 UTF-8 路径与 receipt：中文、非 BMP、引号和换行；正常结果、空结果、错误退出、不可解析结果；临时 release 清理。仅临时 synthetic 目录。
6. 新 admission 在 Key 前核对身份/价格/目录；零凭据供应、零真实 Store 创建、零模型请求。旧 R6 admission 继续拒绝。
7. diff --check 与直接 scene/wake 回归。无需全套 npm、截图或重跑已知因历史身份固定而失败的 R1–R6 整套测试；不得把旧失败计为通过，也不为全绿刷新旧 pin。

## 交付与停止

允许改动仅为新 r8 接线、专项测试、新验证文档及权威副本。必要共享接线若超出现有 profile 扩展能力，先报告具体阻碍，不自行重写引擎。

普通提交推送同一 #109，保持 Draft。回执给出 HEAD/tree/parent、changed files、execution/pin/identity/release 候选哈希、实际请求 bytes、价格证据路径/时间/hash、测试实数及首次失败、无真实模型/Key/旧 Store访问证明。报告唯一 secure-input 命令作为候选，不执行、不提示用户输入 Key。

结束状态：READY_FOR_TOTAL_CONTROL_REVIEW_R8、PRICE_REVIEW_PENDING 或 BLOCKED。总控核对实际实现后才交付用户一次执行命令。此时才进入一次新场的人工触发；无论成败均停止并审阅内容，不自动追加修正包或新场。单场成功不等于三气候/长期质量或完整 V1 验收。未 ready、合并或部署。


---

# R9 · 无证据 appraisal 的确定性 UNKNOWN 归一化

2026-10-29 总控裁决：R8 真实单场已停止并保留。此次只授权同一候选内的离线协议修正与审计证明，不授权重跑、补跑或新的付费 release。沿用原 worktree、原分支和 Draft PR #109；不得另开施工包、worktree 或 PR。

## R8 固定事实

- 实现 HEAD 为 \`fe0b196a0a22210107205a0a6660955251c8f724\`；R8 receipt profile 为 \`r8\`，runId 为 \`nv-dream-climate-one-dream-r8-a\`。
- 唯一真实请求是 scene 0；provider 返回正文完整，usage 为 input 1114 / output 136 / total 1250，settled 计算额 3316 micro-CNY，unknown 保留为 0。该数值是本地按 usage 计算的账务额，不冒称 provider 实扣确认。
- run 因 \`scene_response_rejected / unbased_appraisal_requires_placeholder\` 停止；0 幕保存、0 wake、0 firstFeeling、0 residue、0 发布、0 重试。release 已撤销，Store 已关闭，owner lock 已清除。
- receipt SHA-256 为 \`034b53bd5ea4b59f7033c19cc556bdc0be2cb9addc6034937c7dea5e18f02c2a\`。历史 Store、receipt、账务和 R1–R8 文档均不得改写。
- 被拒对象如下；这是模型返回的虚构内容，不是现实事实，也不是正式梦簿记录：

\`\`\`json
{"event":"梦里，一个人把一只白瓷杯搁在窗台上，杯里剩一点温水。雨刚停，街面泛着灰白的光。另一人伸手用指节在杯沿上轻敲两下，声音很薄，杯壁随之微微一颤。随后那人把杯子往窗台内侧挪了挪，像是要把这场对话留在那儿，却没说下次再讲的是什么事。","appraisal":{"goalEffect":0,"control":0.5,"uncertainty":0.6},"basis":{"goal":null,"control":null,"uncertainty":null},"affect":{"kind":"unchanged"}}
\`\`\`

失败不是梦正文不合格，而是 \`basis.uncertainty=null\` 与 \`appraisal.uncertainty=0.6\` 不符合现协议的 UNKNOWN 占位 0.5。现有 prompt 已明确说明该规则；本轮不得再靠追加同义提示词、增加重试或再付费碰运气。

## 唯一允许的语义改动

在 dream-climate 候选的本地 normalization 边界增加确定性 canonicalization，规则仅限以下两维：

1. 对 \`control\`：若 \`basis.control===null\`，则 canonical \`appraisal.control\` 必须为 0.5。
2. 对 \`uncertainty\`：若 \`basis.uncertainty===null\`，则 canonical \`appraisal.uncertainty\` 必须为 0.5。
3. 模型原值为合法有限数且处于现有范围、但不是 0.5 时，不因该差异拒绝整幕；只把对应 canonical 值降级为 0.5，并生成程序审计记录。模型原值不是合法有限范围值时仍按原规则拒绝。
4. 这不是推断、评分或“修好情绪”。null basis 表示没有可核验的本幕证据；0.5 仍只表示 UNKNOWN 占位，不表示测得的中点。不得从正文猜测 0.6 是否“其实合理”。
5. canonicalization 不得改动 event 的任何字符，不得新增、删除或改写引文，不得修改 goalEffect、basis.goal、affect.kind、delta 或 affect excerpt。非零 goal 无证据、非法/跨幕引文、非法 affect、额外字段和错误 schema 继续严格拒绝。
6. basis 为非 null 时继续要求本幕逐字引文；不得把非法引文降级成 null，也不得用 previousScenes/source 补证据。
7. 已合法的 null + 0.5 输入保持逐字等价；合法有证据输入保持原值。不得把该规则扩展到 wake、firstFeeling、residue 或 associations。

优先在 \`scripts/nv-dream-climate-offline-01/\` 候选边界实现；共享 \`src/\` 冻结。若无法在不修改共享 src 的情况下安全完成，报告明确阻碍并停下，不自行扩大范围。

## 审计与保存边界

- 每个被 canonicalize 的维度必须留下程序生成的、确定形状的审计项，至少含 dimension、receivedValue、canonicalValue=0.5、rule=\`unbased_requires_unknown\`。不写主观情绪词，不声称语义正确。
- 审计必须与成功 scene 的 checkpoint 一起受完整性校验，或存于同一 run 的不可分离审计记录；不得只写测试日志，也不得在成功后丢失原值。
- 后续模型输入只接收 canonical scene 与原有叙事字段；程序审计不得伪装为梦正文、basis 引文或新的记忆素材。面向梦簿的默认阅读面不显示技术审计或模型名。
- checkpoint 重读必须得到同一 canonical scene 和同一审计；篡改 received/canonical/rule/dimension 任一字段应拒绝。不得为了通过旧 checkpoint 校验静默删除审计。
- 若现有固定 scene schema 无法安全容纳审计，可在本包 runtime/run record 中建立与 sceneIndex/requestId 绑定的独立固定结构，但必须原子保存并进入 identity/checkpoint 完整性证明。不得建立通用修复框架。

## 冻结项与身份

冻结 R7/R8 scene/wake prompt 文本、source、fixtures、气候/机制/foreground anchor、firstFeeling 四态、逐字 fragment、simulated residue、预算和价格。本轮不修改 prompt 来宣称提高模型服从率。

允许改动仅为：
- 候选 \`protocol.mjs\` 的最小 normalization 接线；
- 为保存/校验上述审计所必需的本包 runtime/record 薄改；
- 新 R9 专项测试与验证文档；
- 本权威副本及受真实执行依赖影响的 identity/manifest 一致性更新；
- 在任何凭据前关闭 R8 及所有旧 live 入口。

normalization 语义已变化，必须生成新的 normalization/identity 候选并如实列出；旧 R8 execution pin、identity、release 一律拒绝。不得生成可执行的新 live release，不得刷新 secure-input 命令，不得读取 Key、余额、真实 Store 或价格网络，也不得调用模型。

## 有限离线验证

1. 用上面的 R8 精确对象通过实际候选 normalization：event 逐字符不变；goalEffect/control/affect 不变；uncertainty 从 received 0.6 canonicalize 为 0.5；审计恰有一项且内容固定。
2. 表驱动覆盖 control/uncertainty 各自 null + 非 0.5、两维同时、null + 0.5、合法本幕引文；canonicalization 必须幂等。
3. 非有限/越界数、非零 goal 无证据、跨幕或不存在引文、非法 affect、额外字段仍拒绝，且不留下可发布 scene。
4. checkpoint round-trip 保存 canonical 值与原值审计；审计任一字段被改写、删除、换 sceneIndex/requestId 均拒绝。builder 不把技术审计注入叙事/source/basis。
5. synthetic 单场 3 scene + wake 可完整闭环，其中第一幕使用 R8 精确对象；4 calls、3 draft/正式 scene、逐字 fragment、firstFeeling 四态之一、独立 residue、后来回想为空。只用 fake transport；零真实 Store、Key、网络、模型和费用。
6. fake 非法 goal/引文/affect 仍在首处失败停止，usage 结算一次、无发布、无重试。R8/旧 release 在凭据、Store 和网络之前失败关闭。
7. 运行 R9 专项及直接受影响的 scene/checkpoint/runtime 最小回归、旧付费失败关闭检查与 \`git diff --check\`。不刷新历史 pin 来追求旧整套全绿，不重复全套 npm 或截图。

测试证明只限结构处理与账务/发布边界，不证明文学质量、语义支持、模型长期服从率或 V1 完整验收。首次失败与修正均如实记录，不得用 synthetic 结果冒充真实梦。

## 交付与停止

普通提交推送同一分支并更新同一 Draft PR #109；不 ready、不合并、不部署。回执必须给出 HEAD/tree/parent、changed files、新旧 normalization/identity、R8 旧入口关闭证明、测试命令与实数，以及 R8 历史账务未改写证明。

结束状态仅为 \`READY_FOR_HUMAN_OFFLINE_REVIEW_R9\`、\`BLOCKED\` 或 \`TOTAL_CONTROL_DECISION_REQUIRED\`。到此停止，不提供 Key 命令，不启动 R10，不自动申请真实试跑。总控先审阅这次架构修正是否足以结束“内容被元数据格式挡住”的问题，再决定是否还有一次人工触发；没有总控新授权就不产生下一笔费用。


---

# R10 · R9 后一次单场内容闭环准备

2026-10-29 总控审阅结论：接受 R9 的有限离线实现。它解决的是“合格梦正文被无证据 control/uncertainty 数值挡住”的确定性处理，不证明文学质量或完整 V1。现授权在同一候选上准备一次新的单场闭环，仍由用户后续主动输入 Key 才能发生真实调用；施工端本轮不得执行。

这不是自动续错包。R10 是当前链路的单次内容验收准备：真实结果无论成功或失败都停止，直接交回总控阅读，不因新的格式差异自动启动 R11。

## 固定起点与旧事实

- 固定实现 HEAD：\`fe0afa3ee734611bc949de33b61e4d19e2151f13\`。
- 沿用 worktree \`C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01\`、分支 \`codex/nightvoyage-dream-climate-offline-01\` 和 Draft PR #109。
- 冻结 R9 normalization \`nv-dream-climate-offline-normalization-v2\`、offline identity \`153503232906afd729d78054cc199ee71a9ea6aca8ebfd7ddfb6ebe7283ac867\`、promptHash \`89b1d4a87d53f41b697341dd32fb4bb3ad41b665e2a47b68a3d5e5464cbf3c38\`、sourceHash \`605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6\`。
- R8 历史保持失败：一笔 settled 计算额 3316 micro-CNY、unknown 0、无发布；receipt SHA-256 \`034b53bd5ea4b59f7033c19cc556bdc0be2cb9addc6034937c7dea5e18f02c2a\`。不得恢复、迁移、补发布或重写 R8 Store。
- 所有 R1–R8 live release 和 secure-input 入口继续在凭据、Store、网络前关闭。

## 唯一新运行配置

- profile：\`r10\`
- runId：\`nv-dream-climate-one-dream-r10-a\`
- allowanceId：\`nv-dream-climate-one-dream-r10-001\`
- 专用 Store：\`C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r10-01\`
- matrix：\`ordinary / transformation / cup_tap\`，两个 used ledger 均为空
- 固定 1 场、3 scene + 1 wake、最多 4 calls；无重试、无第二场、无替代场、无第五次
- \`max_tokens=400\`；每请求上限 16384 UTF-8 bytes
- 每次预留上限 35968 micro-CNY，四次最坏 143872，硬上限 160000 micro-CNY（0.16 CNY），不得扩大
- 沿用 2026-10-29 已保存的官方价格证据 \`C:\Users\Administrator\Desktop\deepseek-pricing-r8.html\`，SHA-256 \`556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3\`。施工准备只读核对，不联网刷新；文件缺失、哈希不符或固定价格不匹配则 \`PRICE_REVIEW_PENDING\`，不得自行换模型、改预算或抓取别的页面。

选择 ordinary 只是固定本次样本，不是梦境配额、用户状态或长期概率结论；不能由它推导 firstFeeling 或 residue。

## 最小施工

新增 \`scripts/nv-dream-climate-offline-01/single-run-r10/\` 的薄接线，复用现有 R9 protocol、Phase B runtime/records/diagnostics/transport 和 UTF-8 receipt 机制。不得复制生成引擎、建立通用 profile CLI、修改共享 \`src/\`，也不得改 prompt、source、fixtures、气候/机制语义、情绪规则、wake schema 或 R9 canonicalization。

R10 identity 必须覆盖实际执行依赖，包括 R9 protocol、runtime、records、transport、diagnostics、固定 profile/matrix、价格、预算、Store、模型参数和无重试规则。生成新的固定 execution digest/pin 与 release 候选；pin 不能随 manifest 同步漂移后自行通过。R8/R6 的 pin、identity 或 release 不得复用。

R9 审计必须进入真实技术 checkpoint 与显式 receipt：received value、canonical 0.5、dimension、rule、sceneIndex、requestId 均保留并校验。后续模型材料和正式梦簿 entry 继续剥离技术审计；原梦 event 不改字。无 canonicalization 时允许固定空审计，但不得伪造 received value。

secure-input 沿用已审查流程：

1. 所有身份、execution pin、价格、目录不存在、固定配置检查都在 Key 提示前完成。
2. 只有用户主动运行唯一命令时，才临时写一次 release、私密读取一次 Key 并启动一次 worker。
3. 不读命令行明文 Key、环境变量凭据、剪贴板、凭据库、旧 Key 或余额；Key 不持久化、不回显。
4. 完成与失败路径都撤销 release、关闭 Store、清理 owner lock。
5. 目录已存在即拒绝，不能删除后重跑。
6. provider 已返回且 usage 合法时，即使正文被拒也只 settled 一次；结果未知才记 unknown。不得把 combined accounting 冒称 provider 实扣。
7. 成功时三幕、wake、可选 firstFeeling、residue 原子发布；失败时只保留允许的 draft/诊断/账务，不追认不完整梦。

## 有限离线验收

1. 真实 R10 builder 的首请求字节实测并小于 16384；system/prompt/source 与 R9 冻结值一致。
2. fake 四次成功闭环：第一幕使用 R8 精确对象，证明 \`uncertainty 0.6 + null basis\` 在 R10 实际 runtime 中 canonicalize 为 UNKNOWN 0.5，原文逐字不变，审计保留；后两幕与 wake 完成，正式 entry 不含技术审计。
3. fake 覆盖无 canonicalization、control 与 uncertainty 各自及同时 canonicalization；receipt/checkpoint round-trip 和审计篡改拒绝继续成立。
4. 非法 goal、跨幕/不存在引文、非法 affect、wake associations 对象数组、非法 firstFeeling 仍在首处停止；有效 usage 恰一次 settled、无发布、无重试。
5. 新旧 release、identity、pin 不混用；代码+manifest 同步漂移、目录已存在、第二场、第五次均拒绝。
6. 实际 Windows PowerShell 调用新的 secure-input，以无凭据 stub 验证批准 digest 匹配/不匹配、UTF-8 中文/非 BMP/引号/换行、正常/空/错误/垃圾输出、receipt 独占写入及临时 release 清理。不得提示真实 Key。
7. admission 阶段 credential supplier 0、真实 Store 0、模型/网络 0；R8 及旧入口继续关闭。
8. 运行 R10 专项、R9 与直接受影响的 scene/wake/runtime/records 最小回归、旧付费关闭检查、\`git diff --check\`。无需全套 npm、截图或为历史身份测试刷新旧 pin。

## 交付、人工触发与终止线

普通提交推送同一分支，PR #109 保持 Draft。回执必须给出 HEAD/tree/parent、changed files、R10 execution/pin/identity/release 候选、首请求 bytes、预算/价格核对、测试命令与实数，以及唯一 secure-input 命令；本轮只展示，不执行、不提示 Key。

施工终点仅：

- \`READY_FOR_TOTAL_CONTROL_REVIEW_R10\`
- \`PRICE_REVIEW_PENDING\`
- \`BLOCKED\`
- \`TOTAL_CONTROL_DECISION_REQUIRED\`

总控审阅实际 R10 接线后，才可能把唯一命令交给用户。用户执行后的真实结果无论成功或失败都停止：不自动重试、不补跑、不新建 R11。若成功，下一步是直接阅读原梦、梦中情绪、醒来残片、刚醒心情和模拟余韵，裁决 V1 内容候选；若失败，先按真实诊断判断是否应接受现有 V1 边界或暂停，而不是继续无限门禁。未 ready、合并或部署。

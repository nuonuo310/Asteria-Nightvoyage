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

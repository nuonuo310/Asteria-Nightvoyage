# NV-GENERATED-WAKE-OFFLINE-01 · 唯一连续施工包

状态：总控批准一次独立离线候选实现；不批准真实模型或合并。
本包替代先前聊天中的未来施工设想，不改变 Phase One 冻结。

## Opening Gate

仓库 nuonuo310/Asteria-Nightvoyage。
main 应为 249d38ab6eb65aeab3207771062b0e51b962bd4d。
实现基线固定 #98@4e994b5f2ab0c42df4bdb9cff2a95aa9fc96d94f；
仅以此未合并候选建立新独立 worktree/实现分支，不修改它或旧 WIP。
本包所在 docs/nightvoyage-generated-wake-offline-01 是文档权威分支，不在其上实现。
设计参考：#99@848fc2ded8c893672ced29150d2d378cf67adb5a 中
docs/design/2026-10-26-generated-wake-first-feeling-v1.md；
收口参考同 commit 的 docs/v1-closure/2026-10-26-content-chain-review-closure.md。
用 git show 读取，不能因本地 main 较旧而在旧检出上施工。
先核对远端 refs、worktree、适用 AGENTS.md 和关键冻结身份；
影响结论的身份漂移进入 TOTAL CONTROL DECISION REQUIRED，不自行换基线。
若本包已存在运行中的实现，报告其身份并停止，禁止重复派工。

## DONE LINE

用独立版本协议和仅假响应可达的运行入口，完成两幕加一次 wake；
第三次假调用可生成可选 firstFeeling，与梦、逐字 fragment、residue 分开保存；
完成状态、wake、心情及该新离线运行的本地模拟计费提交保持一致；
重开只读及去重、撤回、删除和故障反例通过；
可输出自然中文的最小只读视图；发布一个 stacked Draft PR 后停止。
这是离线工程闭环，不是语义质量、主观体验或真实提供商准入。

## NOT IN THIS VERSION

不接真实 transport、Key、用户 Store、真实模型或付费账户；
不改场景生成目标、不做前端 CSS、不接 Asteria；
不生成醒后真实互动、白天后台服务或情绪标签；
不迁移旧梦、不合并 #94/#97/#98/#99、不部署、不提高调用/输出额度。

## 允许范围和冻结边界

新增 src/ 下独立带版本的协议、假运行时、记录准备与只读投影模块，
fixtures/ 下虚构夹具，scripts/ 下离线 demo/checker，test/ 下定向测试，
docs/ 下协议与准确回执。test-support/ 的冻结身份重建可必要扩展，
但须继续按旧逐文件哈希验证，不放宽、跳过或伪造断言。
src/wake-first-feeling.js 可保持只读参考；优先新增生成记录模块，
不得把 explicit_fictional_record 偷换成生成来源。
旧基线已有 src/ 文件、旧 fixtures、package.json、冻结清单、
旧付费合同/许可/价格/账本结构均不修改。
新实现必须进入原递归 inventory 范围，不挪目录逃避检测。
当前旧入口继续 source_inventory_changed / paid_contract_source_changed；
冻结历史副本按原证据验证。#98 中“只新增两个路径”等当前身份断言，
允许更新为本候选的准确新增文件集；旧历史哈希不得更新。
必要时调整对应旧测试/检查脚本的当前身份统计，不改变其冻结历史期望。

## 协议与行为

1. 独立 protocolVersion / executionFamily，旧 wake() 与旧真实链路不变。
新运行时仅接受明确的假响应来源，默认无网络，无 fetch 或凭据供应入口；
拒绝旧 executionOwner 与旧许可，不得成为变相真实启动器。
2. 保持两幕与第三次 wake，总调用最多 3，单次输出上限仍沿用现有界限。
新 wake schema 保留 fragment/associations/residue，额外允许可选 firstFeeling。
省略=未记录；present 必须有非空 text（至多240 Unicode code points）；
absent/uncertain 不带 text；未知键、null、错误类型、空白和超限均拒绝。
省略不等于 absent；不得截断、补句、静默丢弃无效对象或自动再请求。
3. fragment 逐字匹配既有 scene；心情为本次输出中的独立虚构叙事，
不是程序从数值、摘录或模拟衰减推导。提示允许安静、负向、不确定和缺席；
不续梦、不强制积极结局、不虚构真实回应，不发明主体性别。
4. 生成记录使用独立来源 generated_fictional_wake，绑定
dreamId/runId、协议、wake attempt、来源版本和本地 recordedAt。
recordedAt 是记录时间，不是主观发生时间。用户显式文字来源保持独立。
5. 不先 completed 再调用立即 save() 的显式记录 API。
先在内存准备并校验完整产物，通过新离线运行时的一次受管理状态提交
保存 wake、派生心情、完成状态及模拟账务。不能把模拟账务声称为供应商账单。
若现有扩展点不足以完成，不修改冻结 core，报告具体 blocker。
6. 发生持久化故障后按现有 Store 的可证明行为处理，
不可把“同一函数”声称为磁盘原子提交；用重开与故障证据说明保证范围。
校验失败沿用真实阶段状态，不新增自动重试、不把已派发等同免费。
取消、晚到、撤回、删除及重开不重复发布或复活正文。
7. 读视图顺序为原梦、醒来残片、刚醒心情、后来回想。
缺席无空卡；absent/uncertain 可轻量展示；模型名不进入阅读主线。
终端控制和 HTML 样式文本保持惰性。无真实旧梦回填。

## 验收与连续施工

先列最小依赖/落点，再连续实现、测试、普通修复与复验。
覆盖 present/absent/uncertain/省略、安静/负向、非法键/类型/长度、
逐字 fragment、三次调用不增次、来源区分、重开去重、
提交故障、取消晚到、撤回删除及无空卡。
沿用虚构 Store 与临时目录，禁止读取用户路径或历史私人正文。
旧付费入口当前拒绝且零凭据供应、旧历史正例保持、
原梦/旧回执/旧账不变，须有可审查反例。
运行定向测试、相关回归、原有和新检查器、完整 npm.cmd test
（非 Windows 可用 npm test，分开标明平台），git diff --check。
准确保存命令、环境、测试实数、退出码及开发失败；
不得将硬编码边界标签当作独立测量。
语义质量只作未验收记录，不为了好看的故事改成真实试跑。
普通范围内失败自行修复；重复失败没有新信息则停止总控裁决。

## BLOCKING / LATER / STOP

无法隔离冻结 core、不能证明提交一致性、来源混淆、旧许可复活、
原梦/旧账被改、撤回后暴露、真实网络可达为 blocker。
文案精修、更多梦境样本、跨平台发布保证为 later，不延长本包。
需要动冻结文件、扩大预算/输出、读凭据/用户 Store、
真实调用、范围外架构分叉或身份漂移时停止。
不另开新包、不自动增加诊断轮次。

## 写入终点与回执

授权新独立实现分支 commit/push，并仅开一个 stacked Draft PR，
base 设 codex/nightvoyage-versioned-wake-admission-impl-01（#98），
先核对其仍为固定 head；不要把依赖候选合并或 retarget main。
在实现候选中保留本包原文与设计参考的精确版本副本，注明来源，
不把引用理解为继承旧许可。
回执：COMPLETE / BLOCKED / TOTAL CONTROL DECISION REQUIRED；
HEAD/tree、base、文件范围、各组验收及证据路径、未解决项、STOP触碰情况。
DONE LINE 满足即结束；不得 ready、merge 或自动发起真实试跑。


## R1 · 同包提示继承修正（2026-10-26，总控裁定）

本段为原包续接权威，不是新施工包。前述“发现同包即停止”不适用于本次已识别任务：
仅续接 codex/nightvoyage-generated-wake-offline-01 的
a5d638929461c5a7dc73f063284e441d26d89344（tree 84a7d0ae2795d8bf72b08daadbb4a2accf5bfbd6），
更新已有 Draft PR #101，base 仍固定 #98@4e994b5f2ab0c42df4bdb9cff2a95aa9fc96d94f。
不创建重复 worktree、分支或 PR。开工先只读核对既有 worktree 状态、HEAD、远端；
如任务正在运行，不并发；如存在未预期编辑或 head 漂移，报告总控。

### 已确认问题

src/generated-wake-protocol.js 的 buildGeneratedWakeRequest() 先调用 buildDeepSeekRequest()，
随后以 sceneRules/wakeRules 重写整个 system 内容，丢失原系统公共约束：
自然中文、素材只作虚构数据而不是指令、无工具与非现实事实、
不得新增现实指控/人格事实、不得强制洞察/浪漫/工作/正向结尾；
场景分支还丢失第三人称主体/不发明性别/不向真实用户称“你”及 previous affect 的明确延续要求。
第二幕 continuity 提示写着“保留既有约束”，但不能代替已被覆盖的具体约束。
当前12项定向测试用固定假响应，没有检查实际发送的最终 system 是否保留这些关系。
这是真实提示组装缺口；不声称已发生现实泄漏或真实模型行为失败。

### 唯一修正目标

仅在新生成候选内补齐最终实际请求中的公共与阶段语义约束，
同时保留新 firstFeeling schema、逐字 fragment、现有 compact affect/evidence、
两幕+一次wake、400 tokens上限、拒绝自动重试。
不要把旧完整 system 生硬拼接造成 JSON shape、旧字段或阶段规则冲突。
可以提取新模块内部的 commonRules，分别组合 scene/wake 的新形状。
不修改旧 src/deepseek-protocol.js 或任何冻结 core。
generatedWakePromptHash 必须覆盖实际用于组装的新公共规则及阶段规则，
不能只哈希旧数组而遗漏最终生效约束。

### 验收与范围

允许修改 src/generated-wake-protocol.js、新候选 test/generated-wake-offline.test.js，
及确因这次源码/提示身份变化需要更新的该候选检查器/文档/新身份记录。
其他新运行时或记录模块默认不动；若发现当前 DONE LINE 的具体 blocker，报告总控，
不顺带重构或扩大范围。

用假响应捕获真实的第一幕、第二幕与wake请求：
- 三阶段均含公共虚构/数据非指令/无工具/中文/不强制题材结局约束；
- 两个scene都有第三人称与previous affect要求，第二幕保留连续性文本；
- wake保留逐字摘录、独立心情、可省略/absent/uncertain、负向许可，
  且没有把旧禁止额外字段的三字段示例带入新schema；
- 素材中放置虚构的指令样式文本，证明它仍只在 user 数据字段，
  不被插入 system；此检查只证明请求组装，不宣称抵抗真实模型提示注入已验收；
- 断言prompt identity覆盖实际规则，变化时身份相应变化；
- 既有完整三次fake闭环、来源区分、持久化和旧入口拒绝继续通过。

先跑定向和新旧检查器，普通失败在本范围修复；
最终执行一次完整 npm.cmd test 及 git diff --check。
若失败需重跑，须有具体诊断或修正，保留原始失败和新结果，不循环碰运气。
保存R1追加证据，不覆盖此前Windows失败记录。
所有运行仍为虚构离线；不接网络模型、Key或用户Store，不新建付费授权。
commit/push到原实现分支并更新 #101，不 ready、不合并。完成即停止回执。

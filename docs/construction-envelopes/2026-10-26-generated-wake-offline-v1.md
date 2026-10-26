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

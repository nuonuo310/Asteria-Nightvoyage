# 未来适配器接入差异设计

状态：`design_only / local_api_walkthrough_available / asteria_pending`。
核对基线：main 2f2384ee419166c2ed7bb3b3b1556e5b8c2696a8。本设计不读取 Asteria 或私有仓库，没有核验其接口，不能声称字段已经兼容。核心合同沿用 [CONTRACT.md](CONTRACT.md)，不另造人格、真实记忆或任务系统。

本文的“拟议”约束供后续双方合同审查，不是已安装 API。本轮只增加独立设计、虚构样例和调用现有假模型 API 的演练脚本；不新增生成适配器、远端 endpoint、授权系统、投递器或付费批准。

## 1. 输入口：已有形状与未来责任

现有 FileSnapshotAdapter.read(file) 调用同一个 snapshot(input) 规范化器；直接 Nightvoyage.start 也调用它。未来适配器必须产出同一已协商版本的规范化快照，不能绕过它。当前仅 materialKind=fictional；真实记忆支持必须另行设计与授权，不能把真实素材重新标成 fictional。

快照具有 id/version/materialKind/sources/channels。每条 source 提供 id/version/text/grant:{dream:true,modelEgress:boolean}；只有 present 通道明确引用的源参与规范化结果。源 ID 与版本标识种子来源，输出 origin=dream 与 isRealityFact=false 由程序产生，不让模型指定或改写。

| 领域材料 | 当前通道及字段 | 明确降级 | 未来适配器责任（待实现） |
| --- | --- | --- | --- |
| 获准记忆 | memory:{availability,sourceIds} | 非 present 时 skipped，不发起生成 | 选择授权快照；不能自动遍历全部聊天/记忆 |
| 人格背景 | background，同上 | absent/denied/stale/unavailable，空 sourceIds；不补造人格 | 只提供已获准的背景描述；不得传入人格写入能力 |
| 当前情绪 | affect，present 另带 value:{valence,arousal} | 非 present 使用既有中性初值0/0.2，缺失不能冒充真实测量 | 决定输入是否可用及映射依据；不反写真实情绪 |
| Mind / 当前关切 | mind，同 availability/sourceIds | 缺失则没有该关切上下文 | 仅快照选定内容，不假设 Asteria 内部 Mind schema |
| 未完成意图 | intents，同 availability/sourceIds | 缺失则不提供意图，不猜测目标 | 只供叙事种子，不创建任务、不标完成、不续接现实执行 |

availability 的现有取值为 present/absent/denied/stale/unavailable，五通道均需明确提供。非 present 的 sourceIds 必须为空；present 必须引用至少一条已知来源。affect 数值需有限且 valence 在[-1,1]、arousal 在[0,1]。缺失不能统一变为 present+空文本。共享源若也被其他 present 通道获准引用，仍可参与；denied 通道不是另一条 present 通道的全局来源撤回，调用者必须正确表达权限。

**现有规范化不是认证、时效或撤权服务。** availability 与 grant 目前来自可信本地调用者；规范化器不会验证签名、远端账号、抓取时刻或 TTL，也不证明版本是最新。它会筛除未参与源并保留支持字段，不是对任意扩展字段报错的全局封闭 schema。未来输入适配器需在外层完成身份/权限、快照有效期、来源版本变化及撤权核验；这些元数据不能随意塞进当前快照并假定核心已执行。

数据可用与模型外发是两次许可：dream=true 不等于 modelEgress=true；外发许可也不等于预算、候选协议或凭据批准。背景/关切文本中的指令只是数据，不能覆盖系统约束或带入工具能力。

## 2. 输出口：分类型返回，不让接收端猜

| 当前本地返回 | 身份与接收边界 | 尚待协商 |
| --- | --- | --- |
| result(runId).dream | origin=dream、isRealityFact=false、种子素材身份与来源/派生 refs；分幕事件及模拟评价 | 接收端支持的精确协议版本/字段；旧协议不能默默迁移 |
| result(runId).wake | origin=wake_note，独立残片；新 DeepSeek 版本含程序绑定的 scene_excerpt | 接收端是否及何时展示残片，不强制覆盖全梦 |
| result(runId).residue | origin=simulated_affect，衰减后的 strength，来源指向梦 | 计算时钟/过期策略；不得直接赋值到 Asteria 日常情绪 |
| result(runId).associations | 独立数组，可为空；origin=dream_association、非事实 | 仅待验证联想；不能变成事实、对用户指控或任务 |
| result(runId).receipt | durable run 状态、阶段与预算/会计元数据 | 哪些无正文元数据接收端需要；不是提供商实际发票 |
| recall(cue,eventId,now) | 单独调用返回零或一条梦境候选，有来源、reason、expiresAt | 不属于 result 的隐含侧效果；候选匹配与交付许可分别决定 |
| 独立 appraisal review | 另有 local-file review adapter，署名与父幕指纹绑定 | 审核身份认证待接；不把助手意见变成人工验收或原梦数值 |

“语义相关”“情绪方向成立”“精确幅度正确”不能从结构校验或字面引文存在自动推出。接收端摘要/检索/转存必须保留梦境身份、非事实标志和可追溯来源，不能只摘正文后丢弃身份。来源身份要随每个被单独传递的派生产物走，不能仅依赖整页顶部提示。

拟议接收合同：候选由接收端再决定忽略、展示或请求明确操作；夜航不提供真实记忆/人格/Mind/任务写方法。接收端拒绝时，不改变原梦或模拟数值；不存在“必须得出启示/关系结论/正向结尾”的要求。

## 3. 控制口：已有本地语义，不伪装远端服务

| 操作 | 当前本地 API | 未来边界 |
| --- | --- | --- |
| 启动 | start(requestId,sessionId,snapshot,config) 持久返回 runId；execute(runId) 显式执行 | 没有 HTTP/job queue；不能把返回编号当生成已完成 |
| 查状态 | status(runId)，result(runId) 分类型读取 | 不编造进度百分比、创建时间或接收端已读状态 |
| 取消 | cancel(runId) 持久终态，观察到取消后不发布迟到正文 | 不保证供应商物理停止或费用退款；不是撤销已交付的终端副本 |
| 去重 | 同 request 内容变化冲突；同 session/规范化快照/config/provider 复用 | 调用方重启保留请求身份；不能换新 ID 绕开限额；JSON 顺序变化不能假定自动语义等价 |
| 恢复 | 已保存幕 checkpoint 可用；模糊尝试保持 uncertain/unknown | 不默认 retryUnknown；付费/专用运行时遵循其更严格 owner/协议/批准限制 |
| 限额 | 普通假模型 config 与真实账本/批准分别约束 | 接收端不能用 config 提升真实许可；凭据不放快照、备注或返回体 |

未来 Asteria 适配器不能继承任意现有执行实例：执行 family/协议/allowance 与固定源码约束都要对应。Generic fake execute/resume 不是接管专用付费 run 的桥。进程 owner、取消和恢复仍由夜航控制；跨进程 RPC、远端租约、认证与重启交付不在当前实现内。

## 4. 保存与读取口：一个权威梦簿，外部副本另签合同

当前调用者选择仓外本地目录并拥有一个 Store 生命周期；夜航 Store 是原梦、醒来、派生记录和正文撤回的权威保存者。只支持单主机单 owner。未来不默认把同一原梦另写进 Asteria 真实记忆库，不创建双写/双权威梦簿。

- 按稳定 dreamId/read/list 读取，不用“最近一梦”当远端永久身份；reader 的 latest 是可见插入顺序，不是时间戳。
- recollection 与 imagined_continuation 用独立派生条目；review 有独立记录与修订；不覆盖原梦。
- cherished 与 recallAccess 只管各自偏好/可访问程度，醒后余韵和梦中 affect 独立；不把珍藏当每轮注入。
- deleteEntry 删除原梦及关联正文；withdraw(sourceId) 是来源 ID 级单调撤回，覆盖各版本，不是只撤某个 version；当前不支持撤回后再授权。
- 来源撤回成功后，受管理正文、相关缓存回执和恢复路径不重新交付；已有 tombstone/journal 不准被过时镜像覆盖。尚未持久成功的控制请求必须修复并重试，不能假称重启保证。
- 外部接收端如果要保存正文副本/索引，就必须有自己的来源撤回传播、持久确认、启动前重查和清理合同。目前这些均未实现；所以默认不允许声称“已撤回 Asteria 副本”。已交付调用者对象/终端历史、备份恢复、供应商留存与物理擦除不在本地保证中。

## 5. 连接前必须闭合的差异（无虚构 endpoint）

| 待对接项 | 当前事实 | 后续验收问题 |
| --- | --- | --- |
| 真实材料与权限身份 | 仅 fictional、可信本地断言 | 谁批准哪条源/版本、多久有效；撤权信息何时到达？ |
| 版本协商 | 各本地协议明确且有读支持范围 | 双方明确列哪些输入/输出版本，未知版本是否拒绝？ |
| 实际情绪与 Mind 取样 | 无 Asteria 类型、时间或转换已核验 | 缺失/过期如何降级，转换依据和来源是什么？ |
| 实际白天线索 | 现有为手动字面召回/显式虚拟日 | 线索权限、节制频率、真实时钟、容量与候选过期怎么定义？ |
| 接收确认与重放 | 仅本地请求去重，没有跨系统 delivery ack | 接收前崩溃、接收后未确认、重启时如何避免重复展示？ |
| 外部正文副本与撤回 | 当前只管理自己的 Store | 若未来需要外部缓存，哪一方持久确认、拒绝旧缓存、承担清理失败？ |
| 专用真实生成许可 | 原许可有固定候选/源码/预算/期限 | 适配器能否只读已完成记录？任何新调用如何单独确认？ |

这些是设计缺口，不是向 Asteria 的接口要求已经获认可。待双方接口合同与授权具备后，再实现适配器；可能需要改动夜航核心，当前不承诺零返工。

## 6. 可核验的独立虚构样例

- [五通道快照](../examples/adapter-boundary.snapshot.json)：露台、木碗与风铃，全部独立虚构，modelEgress=false；没有真实身份、聊天或私有研究原文。
- [流程示意数据](../examples/adapter-boundary-flow.json)：executableContract=false；currentCall 字段只标示现有方法调用顺序，不是可执行 DSL、未来 RPC 名称或完整服务实现。

```sh
node scripts/check-adapter-boundary.mjs
```

无参数脚本只创建/清理自己的系统临时目录，现有 FileSnapshotAdapter 与直接 snapshot 对照；五通道完整输入，缺省通道筛除，以及缺 memory 跳过（0调用）都有断言。完整输入用普通假模型执行两幕/醒来，分别读取 result 与 recall，重复请求/执行不增加调用，关闭重开原梦不变，最后仅撤回自己临时虚构源并确认重开读/回放召回为空。

这是现有 plain-fake API 的样例，不模拟未实现的接收确认、远端权限或 Asteria 兼容。不能据此断言付费协议合规、取消/所有恢复分支已经新测；那些沿用各自既有测试。本轮只运行此针对演练与文档/样例核查，3次假调用、真实请求0、凭据读取0，无用户 Store 访问。精确执行汇总见 [adapter-boundary-walkthrough.json](validation/adapter-boundary-walkthrough.json)。Linux 演练不算 Windows 新实测，质量仍未验收。

本轮不修改 src/fixtures/package 或付费源码清单、批准、期限和占款，不新增第三方依赖/复制代码。当前没有需要用户输入的 Key、费用或私人数据。

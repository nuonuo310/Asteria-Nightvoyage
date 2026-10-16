# 梦中情绪估计的独立复核记录：实施前合同

合同标识：`dream-appraisal-review-contract-v1-draft`。**本轮是合同与虚构样例，不是已实现接口或运行成功。** 现有生成协议、模型请求、checkpoint、账本、原梦、typed appraisal view均保持原样。依据项目自有离线对照制定；不声称是经验证的心理学量表。

## 设计裁决

夜航保存模型声明的梦中评价和模拟数值，程序能检查其结构、范围、衔接及字面依据；这些检查不证明真实情绪，也不保证事件能唯一推出数值。复核可以认为方向相容、难以判断或表面冲突，且始终保留评审者身份和不确定性。**复核不反写原梦、不替换delta、不重算after，不自动把非零变为零。**

v1不改coupled生成wire，不增发解释/修复/裁判模型调用。没有强制写情绪词、解释段、正向收尾、回到中性或每幕新奇的要求。保留estimated/unchanged现有分支规则；字面门仍是确定性合同，不能把作者注释升级成语义真值或生产拒绝规则。

选择独立复核记录而不是往原幕里添“已验证”标志。它也不是醒来片段、回想、想象续写、来源记忆或Asteria任务。不存在的Asteria适配器仍标待对接，复核只能作为带来源的意见候选。

## 现状和拟建接口

| 能力 | 当前实际状态 | 本合同拟建行为 |
| --- | --- | --- |
| 原梦/模型声明/字面依据 | 已有coupled场景及readAppraisalView | 复核时只读，验证保存的canonical checkpoint和完整before/after链 |
| 语义观察 | 离线fixture作者注释与独立文档 | 独立record，明确是评审意见，非自动语义结论 |
| 保存复核 | **未实现**；engine.append仅支持recollection/imagined_continuation | 将来使用专门合同，不冒用这两个类型，不放旁路正文缓存 |
| 对外读取复核 | **未实现** | 经来源/删除/父内容版本检查后独立返回，不混入原dream或现有appraisal值 |
| 无复核时的显示 | 当前semanticSupport=not_assessed | 继续“不曾复核”，不默认通过、归零或凭普通文风自动选unchanged |

未来操作的说明性名称是createReview、readReview、listReviews；**当前没有这些可调用方法、CLI或Asteria endpoint**。本合同不保证与尚不存在的远端接口已兼容。

## 拟议记录字段和所有权

固定版本仅支持当前 `coupled-affect-quotes-v1` 的已完成且可读原梦中的sceneIndex0或1；其他协议需另行增加显式支持，不能按相似形状默认接纳。

| 字段组 | 来源及约束 |
| --- | --- |
| schemaVersion / reviewVersion | 程序设置；拟议记录版本dream-appraisal-review-v1 |
| id / requestId | 本地请求幂等身份，沿用safeId；新内容不能覆盖旧id |
| origin / materialKind / isRealityFact | 程序设置dream_appraisal_review；materialKind继承父梦的输入素材身份；isRealityFact始终false |
| sourceRefs / derivedFrom | 从受管理父梦获取并保留编号/版本；不接受caller或模型覆盖，不丢失来源身份 |
| parent | 程序设置dreamId、runId、sceneIndex、protocolVersion、sceneFingerprint；与当时的已保存canonical内容绑定 |
| checkpointCheck | 程序确认保存的checkpoint可规范化并与原链一致；这不是重建provider原始响应或已剪除引文的验证 |
| reviewer | 本地适配器提供actorId和kind(person/assistant)，不从生成响应读取，不伪装人工；它是可信本地边界内元数据，不是新的身份认证系统 |
| assessment | 评审者提交固定enum的事件相关性、两个方向观察、两个幅度状态及短备注；程序只验形状，不认证其语义正确 |
| supersedesReviewId | 可空；复核修改另建记录并引用前版，父场景和评审者须相同；旧记录不被覆盖 |

`sceneFingerprint` 拟按项目现有hash函数对 `normalizeBudgetCoupledCheckpoint(saved,before)` 结果计算（SHA256(JSON.stringify(...))，由规范器固定对象形状和字段顺序），与sceneIndex/父id/协议一起使用。它是内容身份，不是签名、真实世界证明或原始provider响应hash。旧记录不能被悄悄换绑到后来内容相似的场景。

所有不认识的字段/enum、越界index、非有限数、超长/不安全id和备注应拒绝。备注拟最多600 Unicode code points、无二进制或外部附件；具体编码校验需实现时测试。不接受provider/model/endpoint/预算覆盖、工具执行命令、模型补跑或写入真实记忆的回调。

### assessment 的最低形状

- eventRelevance：related / unclear / apparently_unrelated / not_applicable。
- direction.valence 与 direction.arousal 分别为 compatible / underdetermined / apparent_conflict / not_reviewed / not_applicable。二者不可合并成一个“情绪正确”值，也不由某个关键词自动填入。
- magnitude.valence 与 magnitude.arousal：v1仅支持not_established / not_applicable。不提供validated数值量表、精确幅度通过或真人情感证明。
- note：本地评审短备注，可空；仅评当前梦中材料，不把猜测写成真实用户经历或指控。它本身也是需撤回/删除的派生正文，不能进预算账本或公开工程回执。

unchanged声明的direction/magnitude/eventRelevance为not_applicable；这仅说明原声明没有提交变化估计，不认证梦里“确实无感受”。estimated即使delta为零，也不能用not_applicable伪装没有估计；允许not_reviewed/underdetermined。literal checkpoint检查失败则拒绝创建，不能靠assessment“相容”绕过。

相容不等于唯一正确；表面冲突是需复核的意见，不自动使原梦失效或触发修复。更有把握的措辞仍需保留其评审来源。意见可分歧，没有权重总分、自动最高权威或“最新一定更真”的规则。

## 生命周期、撤回与保存边界

1. 创建须同一owner lock下确认父梦已完成/未删/未撤回、来源仍可访问，重验完整链和内容fingerprint。评审不会获得额外来源、来源再授权或modelEgress权。
2. 请求幂等键绑定父版本、评审者、assessment与supersedes。相同请求/内容返回同一记录；同requestId不同内容拒绝。重放仍要重验当前撤回和删除状态，不能仅凭旧receipt返回正文。
3. 原梦和已有复核不覆盖。后续修正另建不可变记录，supersedes只作用于同一评审者/父场景；不同评审者并列。读取必须保留旧版身份，不默默挑一条当事实。评审存续不代表每轮自动注入或成为召回对象。
4. 首次持久化与幂等结果须一次Store原子保存；失败不返回成功、不留下可重放的半记录。中断重开不能生成第二份或导致新的模型调用。实现前需先决定同Store新增集合/record版本，不能把本合同样例直接塞进当前entries。
5. 父梦删除、相关来源撤回时，复核及全部后继意见/备注均属派生内容：立即拒绝读取，按受管理journal清除正文；重开、恢复、缓存/索引、重复请求不得复现。只可保留无正文必要墓碑/幂等身份，不能留下备注、引文或可恢复payload。
6. v1沿用本地单Store/owner锁/原子保存与journal的边界，不新增单独sidecar备份或未接撤回的日志。终端交付、外部备份、供应商保存、物理安全擦除仍不在此机制保证范围。

将来若扩展Store/读视图导致现有coupled profile源码pin变化，旧批准仍应阻断新调用，**不能重签旧profile或改到期来迁就新代码**；旧完成结果与历史账项仍须能读。复核意见不会支付、结算、释放或重新分配三笔unknown，已完成试跑不得借此续跑。

## 接收边界与验证顺序

对外拟分开返回原dream、现有appraisal view、独立reviews。摘要/检索/转存都保留dream来源、parent版本、reviewer和非事实身份；不能把reviewer的“compatible”翻成现实结论。Asteria接收规则待对接，没有直接写记忆/人格/Mind/任务的能力。

| 阶段 | 实现与可验收范围 |
| --- | --- |
| A：纯内存草案规范器/投影视图 | 只用独立虚构父记录/意见，测试字段所有权、checkpoint/来源绑定、闭合schema、estimated/unchanged区分、无网络与非事实身份；尚无运行Store持久化 |
| B：受管理保存与读取 | 明确集合和记录版本；测试原梦不变、幂等/冲突/修订、初始保存失败/真实进程退出、父删除/来源撤回/重开/迟到结果不复现；不访问用户Store或改账本 |
| C：公开方法与本地适配器 | 同合同显式调用、默认不自动复核/注入；保存/读操作独立于生成budget；保留旧profile和历史兼容验证 |

以上均为后续实施计划，**本轮没有宣称A/B/C已实现或运行成功**。本轮只验证JSON设计样例的引用、hash和字段一致性，以及原25个live pin仍未变化；不运行新模型、不重跑现有机制套件，不用文档检查代替将来代码测试。

### 独立虚构样例

`examples/appraisal-review-draft.json` 是说明性包装，明确runtimeSupported=false/illustrativeOnly=true；它引用前轮自有离线fixture中的explicit-relief，checkpoint指纹由现有纯规范器计算。源id、actor和父id均是设计占位，**不是已登记授权来源或实际Store记录，不可用于现有生成/保存入口**。相容方向和not_established幅度并存，展示“不确定”不必删除原变化；没有复用用户梦簿正文。

本合同是项目MIT独立设计，无第三方实现复制、私有研究原文、新依赖或跨仓库修改。单例原梦的质量仍未整体验收。

## 后续实施状态（2026-10-16）

合同首版的“未实现”描述保留为当时状态。[A 阶段纯内存实现](APPRAISAL-REVIEW-MEMORY.md)现已提供两个设计数据 helper，保持 illustrativeOnly/runtimeSupported=false；它不等于上述拟议受管理 create/read/list 接口。持久化、幂等冲突、修订和实际撤回清除仍属于 B/C 阶段，尚未实现。

B 阶段现已实现[受管理存储与生命周期](APPRAISAL-REVIEW-STORAGE.md)：选择复用通用 entries 保存独立版本条目，增加无正文请求索引，而不是把示例包装直接写入旧结构。原梦删除/来源撤回清除所有意见；单条意见删除不删除直接依赖原梦的独立修订，supersedes 仅保留旧编号。C 的显式本地适配器封装仍待实现。

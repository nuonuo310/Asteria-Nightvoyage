# 执行归属：阻止通用假模型接管专用记录

状态：**production_ownership_fix_implemented**。上轮[集成审查](INLINE-PRODUCTION-INTEGRATION.md)发现的通用resume串用路径已在共享核心修复，并用当前源码验证。直接引文的正式协议/真实入口仍未实现，生产集成整体不ready；本轮不产生真实调用或新费用。

## 行为变化

以前，普通`Nightvoyage`能resume其他运行器的failed记录，用FakeProvider发布梦，同时留下与该生成无关的旧unknown。现在execute、resume及核心call先检查归属；不匹配报固定`foreign_execution_owner`，不会先把failed改为queued、改预算或派发。按请求/会话去重重用旧运行也要核验，不能因fingerprint命中绕过。

新运行在第一次保存时就写入`executionOwner`：schemaVersion、明确family和providerIdentity。普通fake、离线评价、compact-v2、coupled、分幕候选、带预算运行器、独立inline模拟/预算stub分别声明family；专用运行器仍保留自己的协议、checkpoint、allowance及提示身份检查。不是根据构造器名称或任意非空标记放行。

| 记录 | 执行策略 |
| --- | --- |
| 新记录 | owner必须与当前family/provider严格相等，专用metadata也须匹配 |
| 旧无owner普通fake | 无billing/appraisal/stub等专属标记才可继续使用原fake合同 |
| 旧无owner专用记录 | 仅专用运行器按明确metadata合同核验；不能降级为普通fake |
| 旧grounded预算记录缺billingProtocolVersion | 仅其原grounded运行器保留旧兼容规则，仍核对allowance及其他身份 |
| 外来/缺损/不匹配owner | 拒绝执行、恢复和去重重用；不倒填owner或改写原梦 |

这些规则不对恶意修改源码或Store文件提供密码学认证。历史记录没有保存provider身份时，无法还原未知的旧provider值；本轮依照已有专用metadata合同校验，不捏造历史信息。

状态、列表、正文读取、撤回/删除与生成权限分开：普通读取仍能看到已保存且未撤回的梦及来源，禁止续跑不等于删除历史。取消不新增调用；撤回优先清除正文/衍生内容/召回，body-free账项保留。梦仍不是现实事实，原梦、醒来、回想与续写不互相覆盖。

## 旧合同读取与派发边界

共享源码变更使旧continuity的50pin发生漂移；旧profile未改，旧初始化/派发继续受阻，不续期、不重置或释放四unknown。没有新reviewed profile或额度。

回归发现旧compact/单幕诊断的历史配置读取间接调用了当前source-pin校验，导致coupled等旧历史也读不出来。本轮拆开这两件事：历史读取仍逐字段/整形hash匹配固定旧合同、来源与fixture；初始化及运行preflight另外强制校验当前源码。新增当前源码测试确认两类历史能读，但ready为false、重新init在创建/修改账户前拒绝。公开历史提案数据不是新批准，不能作为live能力。

## 历史测试保存

`test-support/legacy-owner-core`保存修复前8个项目自有MIT文件，来源提交d94342b1a2caa56e47f8244f3b1a6c875fea40a6；安装进临时测试副本前逐项核对旧continuity profile的LF归一化hash。更早pruned/coupled冻结层随后覆盖其各自旧版文件。生产没有导入这些快照，也不会因source drift自动回退。

原compact入口9项、诊断13项、continuity31项转为明确标记的历史副本测试；coupled23项和pruned13项继续隔离运行。独立虚构旧账本的构造也在临时固定源码里完成，当前源码再执行读取/撤回/新guard验证。冻结测试通过不证明旧批准在当前源码上可继续派发，不能取代当前源码的回归。

## 核验与限制

- 最终Linux全仓535/535；其中五个历史入口包装测试内部另运行9＋13＋31＋23＋13项，不将这些嵌套数量再加到顶层总数。
- 最终当前源码定向：归属18项＋历史读取2项＋inline预算33项，共53/53；临时Linux CRLF副本同组53/53。不是Windows实机结果。
- 新归属反例覆盖API/CLI、queued execute、failed resume、低层fake call、去重重用、伪造/缺损owner、旧无标记fake合法恢复及普通读取/撤回不受阻。现有套件继续覆盖专用合法恢复、真实子进程退出、取消、失败保存、四笔独立虚构hold不变与撤回重开。
- `node scripts/check-inline-integration.mjs`现报告当前通用入口拒绝外来failed记录、运行和synthetic hold不变，native fetch/Key读取均0；`productionFixApplied:true`只指归属修复，`productionIntegrationReady:false`仍保留。旧源码pins为false是预期阻断。

证据与源码hash见[验证记录](validation/execution-owner-validation.json)。初次回归暴露的旧source-pin耦合与历史兼容问题已修正后重跑，最终日志不冒充第一次即全绿。没有打开用户Store，未确认或结清任何真实供应商费用。

保证仍限于受管理单Store、owner锁、原子保存和撤回/删除日志，不覆盖终端/导出/备份、文件历史/物理擦除或供应商留存。本轮没有改变模型预算、真实情绪/人格/任务，没有语义或梦质量验收。

下一步才能做默认关闭的新生产直接引文协议及预算/受限transport的stub集成；旧profile和四unknown继续保留。真实模型、凭据、具体预算及虚构外发仍需在独立入口/提案准备后另行确认。

# Coupled 首次有限真实试跑：用户侧完成

后续：[单例内容复核](COUPLED-QUALITY-REVIEW.md)已完成同作者定性阅读：分幕展开/情绪语义支持有concern，整体仍未接受。下文保留首次运行回执当时的评估状态。

2026-10-16 用户在Windows同步已合并PR #29后，按单独批准的官方DeepSeek Flash、公开虚构sparse-context、最多一梦/三次调用/新3CNY上限及三笔旧unknown保留合同执行。提交的终端输出报告两幕＋醒来completed，三条committed attempt、三条settled billing，随后ready=false/call_limit_reached。输入虚构标记与输出dream/nonfact身份分别保留，typed appraisal view可用。此为用户侧真实试跑回执，助手没有读取用户Store、凭据、供应商控制台或追加模型调用。

只发布独立聚合 `validation/user-local-coupled-live.json`，不提交附件原文、梦/醒来正文、引文字串、run/request fingerprint、用户路径、配置、Key或真实梦簿。下文不重建被丢弃的旧响应。

## 机制与账目

| 项目 | 本次报告及离线核对 |
| --- | --- |
| 协议 | coupled-affect-quotes-v1 |
| 完成 | 2 scenes / 1 wake / 3 calls，全部settled |
| usage | 输入3075，输出268，逐行相加一致 |
| 新账本结算 | 8294 microCNY = 0.008294 CNY，按本地已评审峰时费率计算；不是供应商实际发票/赠送余额核对 |
| 旧unknown | 三笔，6609600 microCNY保留，未结算/退款/重试 |
| 全账本 | 27 calls / 11 registered runs，held-or-spent6654834 microCNY；其中旧unknown6609600，已结算合计45234 |
| 试跑终态 | ready=false / call_limit_reached；无额外预算/调用批准 |
| 当前源码/fixture | 两项匹配true，终端预检credentialRead=false |

两幕都返回estimated声明，并各有一条当前场景内字面匹配的affect引文；每幕审计为received2/kept1/discarded1。未使用引文按已评审策略丢弃，原事件/数值不自动改写。两幕缺goal/control/uncertainty依据，程序存储中的0/0.5占位没有被读视图当成已知判断：三项视图均not_stated/null。正负情绪变化与前后模拟数值连续，仍是模型估计/模拟，不是真实感受证明。

醒来残片逐字属于已保存第0幕，fragmentBasis为scene_excerpt/sceneIndex0，没有新增后续事件；associations为空，允许无启示。醒后residue报告0.2，与梦中delta和日常召回权限分开。浮点加减尾差属于当前数值表示，不从本次输出推断情绪量表有效性。

上述断言直接对用户提交的完整输出在本地离线解析：提取四个JSON对象，核对三条usage/金额总和、每行input×2＋output×8 microCNY、两幕引文属于事件、wake逐字属于所指幕、视图缺失值和前后总额。原始输出仅作为本轮阅读输入，没有复制进仓库或构造历史原文。未重跑模型或测试套件；本次文档与聚合变更的验证是这些断言、JSON解析、diff与暂存隐私检查。

## 结论与限制

这一次真实响应通过当前合同并完成保存/输出，支持“该样本的成对情绪编码＋剪除合法未用引文＋分幕预算闭环可工作”。两幕都选择estimated，**没有验证真实模型的unchanged分支**；不能从一个成功样本推断遵循率提高或比较v1/v2优劣。引用字面存在并不能解释变化方向/幅度是否合理；控制与不确定性的缺失标签得到保留，不代表模型理解已验证。

初读文字连贯、简短，变形和展开仍有限。这里只作同作者单例观察，不设美梦/噩梦、启示、正向收尾、关系或工作配额，也不将成功结算当作梦境质量通过。qualityAssessed仍false，semanticSupport仍not_assessed；没有评价真人情绪、人格、真实记忆或任务状态。

本次live的无Key重读/重复请求去重/线索召回/撤回/重启故障**未在这份终端回执里单独验证**；此前fake/stub相关证据保留，不能套成这次真实运行已验证。后续可在不追加模型请求、不删除梦簿、不修改原梦的前提下，做持久化重读与独立质量复核。先保留这一条真实成功基线，不重开账户、不扩大预算、不因便宜就加样本。新增付费或新的材料范围须另行决定。

代码仍为项目MIT自有实现，Asteria适配器待对接。存储/撤回/外部备份与供应商边界沿用入口合同；本轮只写公开聚合、独立评价及进度，不改协议、prompt、价格/到期、已批准合同或运行数据。

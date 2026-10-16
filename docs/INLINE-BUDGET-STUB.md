# 直接引文：独立预算核心的stub验证

后续说明：本页保留原离线阶段的结果；执行归属已由[后续生产修复](EXECUTION-OWNERSHIP.md)实现，当前旧收费source pins已漂移并阻断派发，旧profile不变。固定脚本现按当前源码如实报告该漂移，历史测试日志不重标。

状态：**isolated_budget_stub_only**。代码已实现并用公开虚构脚本执行；未提供生产协议selector、真实HTTP入口、凭据加载或新收费额度。上阶段[独立模拟运行器](INLINE-RUNTIME.md)继续可用，现有50个生产pin仍匹配，已批准profile不变。

## 独立合同

`test-support/inline-budget-runtime.js`的`InlineBudgetRehearsal`仅接收显式simulator和**stub**模式的合成allowance，默认disabled。live、credential、fetch等选项在创建Store之前拒绝。允许的输入仍必须标为fictional，所有来源modelEgress为false；不读取用户梦簿或Key，不给Asteria发送内容。

采用`offline-inline-budget-stub-v1`单独记账身份，保存既有直接引文运行身份、提示hash、合成allowance编号/hash和accountingMode。新身份只适用于该测试运行器，不能作为生产`GatedDeepSeekClient`或`BudgetLedger`的协议。内部继承的fake计数器保持未使用；对外回执明确标为`synthetic_usage_and_full_context_reservations`，不能解释为真实provider usage。

| 边界 | 实现 |
| --- | --- |
| 保存位置 | 仓库外Store的`inlineStubBilling`，带独立版本；不使用生产`billing`根 |
| 复用范围 | 自有MIT整数预留/结算算法和同一Store原子保存，未复制第三方实现 |
| 预留 | 完整合成context上限＋400输出，整数向上取整；不用请求字节估算费用 |
| 指纹 | 包含本stub版本、runId、实际序列化请求body及snapshot，覆盖提示、前幕和当前输入 |
| 提交 | 正文、阶段committed记录、usage和settled账项通过同一次Store保存落盘 |
| 失败 | 任何已预留但未原子结算的尝试保留完整unknown占额，不保存拒绝正文或任意异常文本 |
| 恢复 | 重开把本stub根下reserved/dispatched改为unknown；仅完整已提交幕前缀且无多余/未知尝试可显式恢复 |
| 去重 | 请求/会话重放不重复派发；allowance hash进入provider身份，不能跨合成额度借用旧会话 |
| 取消和撤回 | 取消/超时中止协作simulator并忽略迟到响应；直接Store撤回也在提交前重新检查 |

两幕＋一次醒来最多三调用。全局运行/调用/金额上限与单运行调用、累计保守输入/输出上限分别检查。已结算用脚本usage，未结算始终保留完整context预留。请求65536 bytes、输出400声称token/1200 JSON bytes沿用；缺依据、非法直接引文、模型/usage不符或新编醒来事件均不补救、不自动追加第四次调用。

原梦、醒来、余韵、联想、回执继续独立带来源；梦中事件不成为事实，原梦不被后来记录覆盖。独立appraisalView仍是上阶段离线只读视图；本阶段没有增加生产评审适配器兼容性。Asteria适配器和真实接口仍待对接，禁止修改真实记忆、人格或任务状态。

## 核验

无需Key，固定检查命令：

```sh
node scripts/check-inline-budget.mjs
```

它只创建并清理临时Store，以native fetch/Key读取guard验证：3次脚本调用、3条模拟结算、3个实际请求指纹匹配、完成重放0次追加、重开可读、撤回后梦/视图/召回不可读，body-free模拟账项保留。没有创建生产billing根。

测试：新增33项，联合原离线运行器25项及当前生产入口31项，共89/89；临时Linux CRLF副本新增33/33。包含真正子进程在预留、派发1/2/3、第一/第二幕提交和醒来提交时退出；初始预留写盘失败不派发，原子结算写盘失败重开只留下unknown；并发、取消、超时、无效usage/响应、醒来拒绝、撤回/删除及账户身份/配置变更均有检查。[日志与源码hash](validation/inline-budget-validation.json)独立保存，未重标前阶段测试。

四笔历史unknown测试完全独立伪造，合计8812800 micro-CNY；在单独stub闭环、撤回、重开前后，原生产billing根JSON保持逐字一致。不曾打开用户Store，不把测试视为真实旧hold清算或退款。

合成fixture使用1100000 context、输入2000000/输出8000000 micro-CNY每百万的**算法测试参数**，因此预留2203200 micro-CNY；3条脚本usage各100输入/80输出，合计模拟2520 micro-CNY。这些不是本轮复核的官方价格、真实token、实际消费或账单。不能据此开放真实调用或释放旧未知占额。

## 限制与下一步

本轮没有新全仓测试成绩、Windows实机、真实HTTP流/网络故障、提供商费用、生成质量或语义验收。simulator接收provider形状请求并返回脚本对象；真实响应流限长、网络超时及认证仍需未来入口单独核验。字面引文成立不等于情绪方向/幅度合理，普通安静的梦也不必有启示。

持久化保证沿用受管理单Store、owner锁、原子保存和撤回/删除日志，不涵盖终端副本、导出、备份、文件系统历史/物理擦除或供应商留存。本模拟账本没有正文缓存，不能作为生产备份迁移格式。

下一步先审查生产集成方案：独立版本/allowance绑定、源代码依赖pins、旧只读历史和四unknown保留、受限transport与阶段结算。不能把本测试分支直接切到live。准备好可审阅实现与提案后，再单独确认提供商、当前价格/到期时间、具体预算及虚构外发；不使用真实私人材料。

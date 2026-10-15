# Coupled 协议的门控预算核心

本阶段实现核心接入和本地 stub 验证。新选择器 `coupled-affect-v1`、协议 `coupled-affect-quotes-v1` 与 `offline-coupled-affect-quotes-v1` 分开。**没有新的付费 CLI、proposal、真实调用或费用批准**。低层 live 模式仍须显式启用及匹配的 live allowance；本轮只使用独立临时目录、虚构素材、dummy credential 和进程内 HTTP stub。

## 合同与实现

- `src/coupled-affect-protocol.js` 复用项目自有的成对字段规范器、请求构造和 checkpoint 校验，转换为独立门控版本。保留原事件、数值、已绑定引文、program-owned normalizationAudit 和 affectDeclaration；不自动选 unchanged，不补依据、不修复、不额外请求。unchanged 只能有 kind，estimated 必须带两项 delta 和整数 evidence 索引。字面依据仍不是语义充分性证明。
- `GatedDeepSeekClient` 新选择器必须有精确匹配的 allowance.protocolVersion，旧 unbound/v1/pruned-v2/offline 账户均不能支付。批准指纹不可重绑；默认禁用、live 禁止 fetch override、来源授权/撤回、有效期、模式、金额与次数门继续生效。没有修改默认选择器、历史报价、原批准文件或到期时间。
- 请求 JSON 超过 65536 UTF-8 bytes 在 reserve/dispatch 前拒绝；provider 内容仍须不超过 1200 UTF-8 JSON bytes、输出上限400 tokens。字节不等于 tokens。边界测试中精确1200可进入场景提交，1201整条拒绝；不截断、不扩大额度。首版没有新的 CLI，未来入口还须在访问 Key **之前**执行无密钥大小预检。低层 send 接收调用方提供的 credential，不能据它声称已经实现 CLI Key 前检查。
- `BudgetedNightvoyage` 第一次 durable start 保存 billing/appraisal 协议、normalizationPolicyVersion 和 affectEncodingVersion；execute/resume 校验这些身份以及完整场景链。scene、声明、依据、审计、committed attempt 与 settled ledger row 在同一次 Store.save 中提交。保存/结算失败不发布正文；重开保留原全额 unknown。已经提交的场景不重发；未知请求即使显式 resume 也不会再 dispatch。
- `readAppraisalView` 识别新版本，重验 checkpoint 后给出来源、dream/nonfact、模型声明/shape_only、unknown 与应用后的模拟数值。声明 unchanged 是显式编码，不等于程序验证了真实无情绪或语义支持。原梦、醒后残片、余韵、召回权限仍分开。
- 新协议自己的固定诊断包括旧白名单及 invalid_coupled_scene_shape / coupled_affect_shape_invalid；任意异常文本、provider正文、caller extras 均不进入账本。诊断仅在精确版本绑定账户保存，不能覆盖 settled 行，不能据诊断退款或假装已知 usage。

## 升级后的旧记录

三个预算核心文件改变，原 pruned-v2 的九个 **历史 pin 原值保留**。当前匹配检查因此 false；旧预检会返回 ready=false / pruned_v2_protocol_source_changed，而不是此前优先显示的 unsettled_attempt_requires_review。这是阻止旧批准执行新版代码，不是占用消失。配置、账项及已保存结果仍按固定历史合同读取，已完成结果无需 Key 重放；撤回继续清除正文。用户三笔未知占用没有被打开、重置、结算或释放。

历史 entry 的13项原探针完整移入 `test-support/pruned-v2-entry-legacy.js`，由一个外层测试在仓库外副本中运行。副本仅把三个预算文件恢复成项目自有 MIT 历史文本，逐一核对静态 profile 的原 SHA-256；其他源码保持当前版本。这证明原入口与固定历史核心的回归行为，**不代表新版核心允许旧批准运行**。三个归档文件在 `test-support/legacy-pruned-core/`，不导入生产模块；测试helper只写显式提供的临时目录。

另有7项历史读取测试：使用固定旧核心和 stub 准备独立 queued/failed/completed 账本，再恢复当前核心读取/重放/撤回，验证 Key 和 native fetch 标记均未访问、旧账户与配置字节不变。过期但 pin 未变的分支单独在固定历史副本测试。没有从用户机器复制配置或梦簿，也没有从废弃响应重建正文。

原离线比较/闭环/大小脚本仍只模拟；改为显示当前 sourcePinsMatch 的实际结果，安装新版后 liveSourcePinsUnchanged=false。历史验证日志不重写。offline 的 liveProtocolEnabled=false 仅指该脚本没有启用传输，不再表示项目没有另一独立门控核心。

## 本地验证与下一步

安全复现，无需 API Key：

```powershell
node scripts/check-coupled-budget.mjs
```

脚本在仓库外临时 Store 使用固定虚构素材、测试专用 stub allowance；完成两幕＋醒来（三次 stub），重开重放零重复，读取 typed view 和 dream/非事实召回，再撤回并重开验证正文/视图不可读，最后移除临时目录。原 fixture 文件的 modelEgress=false 不变，临时副本授予的外发标志只用于通过 stub 路径。原生 fetch 和 Key 环境访问都有拒绝探针与计数，均须零。模拟账项不代表实际费用。

测试范围与最终计数见 `docs/validation/coupled-budget-validation.json` 和同前缀原始记录。22项新核心测试覆盖匹配绑定/默认拒绝、两种分支、诊断、原子失败、真实子进程退出与checkpoint恢复/未知不重试、取消、直接Store撤回迟到响应、超时、usage越界、65536请求门、1200/1201响应门、身份/视图篡改、重放/并发、调用上限及三个合成旧全额占用逐字保留。全套外层计数包含一个历史入口包装测试；其中另有13项子进程探针，计数明确分开，不拿外层数量的变化当功能增减。

初轮新增边界测试对引擎公开错误码、run_busy 的断言写错；修正测试以符合既有错误净化合同。第一次历史包装器继承 NODE_TEST_CONTEXT，子报告为空；显式清除该测试环境标记并选择 spec reporter 后确认13项实际执行通过。上述是测试工具/断言纠正，没有放松生产校验。失败断言曾使未释放测试Promise在清理后报 storage_io_failure；修正后无残留活动。完整最终原始输出保留，不用早期通过数替代最终验证。

本地 fake/stub 只证明机制。真实模型是否正确选择分支、是否省略证据、400 tokens实际适配、语义支持、梦境质量与实际费用均未评估。下一阶段可准备独立、固定素材/源码/到期/次数/金额的有限真实入口和 Key 前预检；准备完成后再决定是否批准新费用，不能沿用旧批准直接试跑。Asteria 适配器仍待对接。

持久化/撤回边界仍限受管理本地 Store 与 journal，清除相关来源、原梦/后代、checkpoint、审计声明、召回缓存；没有新增正文日志、旁路缓存或备份。已交付终端文本、外部备份、供应商保存与物理安全擦除不由本地删除保证。无新依赖、第三方代码复制或跨仓库改动；复用的是本项目 MIT 实现，同作者复查。

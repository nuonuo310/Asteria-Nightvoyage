# 直接引文：试跑意向与账户原子保存

状态：`contract_bound_authority_store_and_stub_stages_verified / live_dispatch_pending`。本轮实现独立的合同绑定授权数据与账户保存，以及生产核心中的逐阶段模拟验证。没有接通真实收费运行器、密钥管道或付费加载器，没有在用户梦簿登记新批准。

## 新候选与记录

当前合同候选改用 `docs/proposals/inline-paid-entry-atomic-20261017.json`、编号 `inline-evidence-paid-entry-atomic-plan-20261017`。前两份非执行草案原样保留，不把旧确认静默迁移到新 hash。价格复核与期限仍是2026-10-17T14:49:00Z至2026-10-18T14:49:00Z，本轮没有重新查价、延长期限或重新授权费用。`implementationReady/liveEntryAvailable/paidEvaluationApproved` 在公开候选中仍为 false。

`initInlineTrialAuthorization` 只接受精确合同确认字段和显式 mode；不读取聊天、Key 或环境来猜测同意。记录 `inlineTrialAuthorization` 绑定当前完整公开合同及 hash、规范 allowance、原有账户/批准/运行绑定基线、创建时间、固定 request/session 和两幕配置。许可状态只能 active→revoked。新账户 `inline-evidence-paid-trial-20261017` 与旧受控 stub 账户分开，不迁入旧合成 usage 或旧余额。

记录和账户在同一次 Store.save 原子快照提交；调用者在提交后未收到成功，可以原样重放，不再创建额度或刷新时间。提交前失败都没有，提交后中断都有；写盘失败关闭 Store，重开只接受完整同批记录。已有无绑定账户不收编，mode 不可重解释，撤销或到期后不能用 init 复活。

mode=live 目前仅表示调用者显式登记的待接线意向。API 的精确确认检查和数据提交已实现，原生收费派发能力没有实现：live 记录不能交给本轮 stub 运行器，也不能交给通用 inline live client/runtime。账本 schema 只对独立编号与固定 entryAuthorizationVersion 接受这种 live 数据；版本字符串不是能力凭据，不能直接放行网络。普通无版本 inline live allowance 仍拒绝，Gated client 的 constructor/send 和 Budgeted runtime 的 live 阻断保留。尚未确认的真实账户币种也不因保存意向而变成已核验。

测试中的 live 意向与确认对象全部自行构造在独立虚构历史上，不是糯糯的真实批准；没有打开用户目录或创建用户的新收费额度。真正入口完成后仍需确认新的具体候选、费用与虚构外发。

## 历史与运行检查

历史 guard 只允许旧 stub 编号和新试跑编号这两种精确候选排除策略，不能任意排除旧 settled/unknown 账户。新基线在首次授权前、owner 锁内采集并持久保存；重开比较原基线，拒绝自洽但已变化的旧账项，不能重新采集掩盖变化。四笔独立虚构旧 unknown 仍逐项保留8812800 micro-CNY，不表示供应商实际扣费已确认。

`InlineTrialRehearsalRuntime` 只能接受匹配的既有 mode=stub 记录和显式本地 transport，默认 disabled；缺记录不建目录，live/mode/Key 参数不接受。固定虚构输入的临时副本可进入模拟请求，公开源 fixture 仍 no-egress。首次运行与 provider identity 绑定授权版本和 termsHash；通用运行器不能接手，通用默认 client 也不能将新账户作为无门禁的调用授权。

六个既有检查点 before_reservation/before_dispatch/before_http/response/before_settlement/publish 全部复核许可、时钟、持久基线、账户、运行/协议身份、配置和完整 payload，继续使用实际 builder 的字节边界。输入/输出预算与金额预留沿用生产账本规则，正文/usage/checkpoint 同次原子结算。途中旧账项或运行协议漂移时关闭 Store，不能在错误收尾中把损坏写盘。

实际进程退出后，只有非空已提交幕、逐幕 settled 与 attempt 对应的前缀可显式恢复，首幕不会重付。reserved/dispatched 未知保留完整2203200 micro-CNY合成预留，不自动补发、修复、退还或清算。取消、超时、撤销、到期和直接来源撤回都关闭迟到正文路径。到期后的撤销可以读取已过期元数据，但不延长日期或授予派发权限。

运行继续使用既有 inline 协议 family，额外授权 hash 区分可执行身份，保留原评价视图与独立评审合同。复查发现最初的新 family 会导致评价视图拒读，已修正并加入完整循环的可读性断言；没有为读取重跑生成。原梦/醒来/回想/续写、梦中情绪/醒后余韵/日常访问程度继续分开，梦境身份始终非事实。

## 验证与范围

无需 Key：

```sh
node scripts/check-inline-trial-authorization.mjs
```

固定 fixture 时钟2026-10-17T15:00:00Z便于复现，不是候选续期。自检分别构造不会派发的 live 意向 fixture 和 mode=stub 的运行 fixture；后者3次本地模拟/3 settled，合成2520 micro-CNY，重放追加0。评价视图可读，召回仍为 dream/nonfact；旧账户逐项不变，撤回重开后受管理正文清除，授权只剩公开合同/来源编号/hash 元数据，不能重建正文。Key读取/native模型请求均0。

最终 Linux Node24.19.0 全仓735/735，相关236/236，临时 Linux CRLF同组236/236；无新增Windows实机。结果见[验证汇总](validation/inline-trial-authorization-validation.json)。新增29项覆盖授权原子失败及实际进程退出、重复与冲突、持久基线、通用入口拒绝、取消/超时/撤销/到期/撤回、迟到响应、结算写盘失败、第二 owner 和运行协议漂移。初轮仅测试断言误把同步拒绝当异步，修正后重跑；读取 family 修复后再跑完整回归。CRLF 是 Linux 临时副本，不是 Windows实机。

当前源码清单79文件；既有运行器演练图33模块/184边，固定 stub bootstrap图34模块/186边，均4类 Node 内建。它们没有覆盖实际付费 session，`paidGraphAvailable` 仍 false，不能用 stub 图或源码清单冒充完整动态闭包/OS沙箱。本轮运行器通过普通测试调用，尚未接到独立子进程入口。

剩余三项：专用 live transport/runtime、准入后一次性私有凭据管道、实际付费 session 的受限加载图与入口。原有无密钥合同 CLI 不新增 init/run/live 动作。现有梦簿读取/撤回不依赖重新批准生成；存储保证限受管理 Store/日志/临时文件，不包括终端、导出/备份、文件历史/物理擦除或供应商留存。真实模型遵守率、语义支持和梦境质量均未验收。

公开仅自有 MIT 实现、独立文字与虚构材料，没有复制第三方实现、私有 Continuity 原文、私人聊天/梦簿/配置/Key，也没有修改 Asteria 或其他仓库。

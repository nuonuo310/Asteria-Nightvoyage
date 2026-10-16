# 分幕候选：协议与账本接入

状态：**implemented_stub_only**（本页记录PR40阶段）。后续独立入口见 [有限试跑入口](CONTINUITY-TRIAL-ENTRY.md)，取代当时的候选live全局关闭，但仍须新批准；以下描述是该阶段边界。这次完成可执行协议、共享账本/运行器和读取适配；尚无候选的付费 CLI、reviewed profile、新价格或费用批准。候选 `mode: live` 在打开 Store 前被运行器拒绝，底层 client 也拒绝；不能用 `enabled: true` 越过此阶段限制。

## 身份与请求

- 新 selector `scene-continuity-v1`，完整协议 `scene-continuity-quotes-v1`，区别于旧 coupled 与两个 offline 身份。
- `scene-continuity-prompt-text.js` 提供唯一提示文本，原比较器仍导出相同文本。仅第二幕添加候选提示；允许普通、停留、确认和无启示，未添加新奇或正向配额。
- 首次 durable start 保存 billing/appraisal 协议、prompt version/hash、pruning/affect/wake policy 身份；执行、恢复和读取检查身份与完整 checkpoint 链。旧协议断点不能直接作为新协议断点。
- 构造最终实际请求体后才预留、计算指纹，transport 发送同一 body；测试在 HTTP simulator 入口逐条核对已持久化账项的指纹。请求上限仍为65536 UTF-8 JSON bytes，输出400 token /1200 JSON bytes；bytes 不当作模型 token。
- 验证沿用 coupled 显式情绪分支、合法未用引文裁剪和 grounded wake；新协议只换身份并增加分幕提示，不放宽证据规则或自动修复。

## 保存与费用机制

使用同一个 `Store`、`BudgetLedger` 和 `BudgetedNightvoyage`；独立 allowance 必须绑定新协议。按已配置完整 context 上界保守预留，usage 校验和账项/阶段一次原子提交；unknown 保留完整 hold，不退款、重置或隐式重发。重复请求、并发、取消、超时、金额/运行/调用限制使用原机制。

本轮只用 **TEST-ONLY 价格和模拟 usage** 验证算术及持久化，不声称核对供应商账单。独立虚构历史测试保留三笔6609600 micro-CNY的旧 unknown holds，不借用或释放它们。这里的数字是测试历史，不是新预算申请。

已结算并保存的幕允许显式恢复剩余阶段；实际子进程退出在第二/第三次 dispatch 后，即使有一/两幕保存，也不能重发该 unknown 调用。保存失败不发布正文，取消/撤回不接受晚到输出。

## 读取与旧批准

`readAppraisalView`、独立 `AppraisalReviewStore` 和本地内容查看明确支持新协议；原梦、醒来记录、独立评审不互相覆写。撤回、删除、召回缓存与重启仍走已有 journal，不另存正文缓存。Asteria 适配器仍待对接。

共享修改使旧 coupled profile 的四个源文件不再匹配。**未修改、重签或延长旧 profile**。当前旧入口显示 `coupled_protocol_source_changed`，不能开始新调用；已完成结果可无 key 重放，失败账项可只读。当前 checkout 的独立虚构历史测试覆盖此区别。

旧23项 entry probes 移入 `test-support/coupled-trial-entry-legacy.js`，在临时项目安装四份与旧 profile hash 完全相同的项目自有 MIT 源码后运行；这是历史行为测试，不是生产 fallback。生产不导入这些副本。旧检查脚本现在如实报告 `liveSourcePinsUnchanged: false`；以前验证文件中的 true 是当时状态，不回写历史证据。

## 证据与限制

见 `docs/validation/continuity-budget-validation.json`。专项覆盖真实进程退出、预算、原子提交、实际 body 指纹、身份篡改、默认关闭、旧历史、独立评审、撤回与删除。固定命令 `node scripts/check-continuity-budget.mjs` 用外部临时目录，守卫 native fetch 和 key 读取，只打印汇总，运行后删除测试数据。

CRLF 检查是在 Linux 临时副本转换换行后执行，不等于新增 Windows 实机验证。当前测试证明模拟机制，不证明真实 provider 配合、真实费用结算、语义支持或梦境质量改善。

首版保证限于受管理的单 Store、journal 和临时文件；不能撤回已经展示的终端文本、外部备份或供应商副本，也不承诺物理擦除。公开内容仅自有 MIT 代码、独立说明与虚构脚本，没有第三方实现复制或用户本地梦簿。

下一阶段仍需独立 reviewed profile、完整依赖 pins、既有外部 Store/旧 hold 校验、credential-free preflight 和完整 Windows 入口。价格/模型/有效期/保守预留重核并给出具体费用方案之后，再请用户确认新费用与虚构素材外发。

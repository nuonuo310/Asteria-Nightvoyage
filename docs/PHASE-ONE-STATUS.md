# 第一阶段收口核对 · 2026-10-18

核对基线：main 516e0d6de52195cbc0b91f241604511418af2f72。本轮为既有代码与证据的只读整理及文档修正，不新增测试或模型调用，不访问用户 Store，不代表新一次运行成功。

裁定：**A/B/C 的首版本地工程目标已有实现与限定范围的证据，可以收口为实验性本地基线。总体梦境质量尚未验收，Asteria 接入未实现。** 这是项目工程判断，不替用户记录人工内容验收，也不宣称生产可用、所有平台完整通过或未来零修改。

## 原目标与现有证据

| 原目标 | 已有实现与证据 | 限定与判断 |
| --- | --- | --- |
| 五种输入、来源/版本/权限、缺失降级 | src/contract.js、src/adapters.js；test/basic.test.js、test/lifecycle.test.js | 文件与直接快照使用同一规范化合同；缺 memory 跳过；当前拒绝真实素材；未来 Asteria 仍待对接 |
| 分幕生成、评价与模拟情绪 | src/engine.js 及专用预算运行时；basic/integration/inline-production 等测试 | 最多两幕和一次醒来；前后情绪连续。数值/结构通过不证明情绪方向、幅度正确 |
| 梦、醒来、余韵、联想分别输出 | engine.result、专用运行时；basic、deepseek、inline 相关测试 | 联想可为空，余韵独立；新 DeepSeek 醒来策略要求已保存幕的连续摘录；旧协议不自动迁移 |
| 持久梦簿，回想/续写不覆盖 | engine.append、Store、test/basic.test.js | 回想与续写作为独立派生条目保留；日常阅读器当前选择原梦及其醒来/评审，不是全部派生条目的编辑器 |
| 珍藏、访问与情绪分别管理 | setPolicy、residue、recall；basic、lifecycle、review 测试 | 珍藏仅保存偏好元数据，不是每轮注入或自动保留守护进程；无默认遗忘或噩梦配额 |
| 启动、取消、状态、去重、失败与重开 | engine/预算运行时、单 owner Store；lifecycle、integration、budget-transport 测试 | 已持久阶段可恢复；模糊远程尝试不保证 exactly-once；专用付费许可有更严格门禁，不能套用普通假模型重试 |
| 调用与费用预算 | budget-ledger、gated-deepseek-client、专用付费入口；budget-transport、inline-paid-runtime、inline-paid-entry 等测试 | 先持久保留再派发，账目与阶段原子提交；unknown 保留全额，不自动退款/重试；无新付费批准 |
| 来源撤回、删除、缓存/恢复不再暴露 | Store tombstone/journal、各读/召回适配器；lifecycle、review、inline-review、daytime、dreambook 测试 | 限受管理正文；失败前未持久的撤回不能声称重启保证；不处理旧备份/已返回副本/物理擦除 |
| 醒来后的线索召回 | core literal recall；scripts/daytime-cue-simulation.mjs；daytime-cue-simulation 测试 | 可交付零或一条带来源的候选；显式虚拟事件、原到期不续期、防时钟回退。非语义检索、真实后台监听或自动投递 |
| 本地日常可读与独立意见 | scripts/dreambook.mjs、dreambook-review-text.mjs；local-appraisal-review CLI | 中文固定状态、原备注、署名、修订与完整 JSON 均可核对；助手意见不是人工验收 |
| 真实模型有界闭环 | 用户明确批准的单样本 inline 试跑及读取/重放/召回回报 | 两幕、醒来、3条 settled；本地账本8358 micro-CNY，不是独立供应商账单；不证明其他输入/提供商/长期质量 |
| 公开资料、许可证与独立实现 | LICENSE、REFERENCES.md、项目虚构夹具及独立源码 | MIT；借鉴公开思路，无第三方实现复制；不公开私有研究原文、用户梦簿或密钥 |

## 证据不是同一种东西

1. 最近一次完整 Linux 回归847/847，针对11/11，记录于 [dreambook-readable-reviews.json](validation/dreambook-readable-reviews.json)。本轮沿用既有证据，不重新跑出数字。
2. 用户 Windows 针对11/11与实际中文显示见 [user-local-readable-reviews-windows.json](validation/user-local-readable-reviews-windows.json)。实际显示不额外证明一次原文/账目哈希不变，也不是 Windows 全套847项。
3. 用户单样本真实运行、后续重放与手动字面召回见 [INLINE-LIVE-TRIAL-RESULT.md](INLINE-LIVE-TRIAL-RESULT.md) 及其聚合引用。真实阶段由用户电脑执行，工作台没有凭据或提供商请求。
4. 虚拟白天有 Linux 测试和 [Windows 独立脚本回报](validation/user-local-daytime-cues-windows.json)；仍不等于真实生活中的自动浮现。
5. 独立助手意见的保存与重开有 [用户聚合回报](validation/user-local-assistant-review-save.json)。固定引文存在只是字面支持；语义关系、情绪方向和精确幅度须分别判断。

## 剩余项的处理

| 项目 | 当前处理 |
| --- | --- |
| 梦境总体质量、真实模型遵守率、精确情绪幅度 | 未验收；不为补齐结论自动增加样本。已有内容可独立评审，保留难以判断或无启示的结果 |
| Windows 完整套件 | 当前阶段不声称已通过；如需要发布级支持，单独安排固定候选的完整验证，不能用针对11项代替 |
| 实际白天接收、节制交付、语义检索 | 后续功能，先定义输入权限、时钟、候选过期和接收约定；不要把虚拟演练当现成后台服务 |
| Asteria 记忆/Mind/情绪/意图实际接口 | 待对接；当前合同仅定义快照与边界，无跨仓库实现授权，不猜测兼容性 |
| 真实私人材料、前端、多人/网络文件系统、备份恢复 | 均不在当前首版保证内，不能视为首轮闭环缺失而擅自扩建 |
| 旧协议失败和 unknown 账目 | 历史保留，不补造丢弃正文/诊断、不放宽旧协议、不清空占款；金额不当作独立已付账单 |

## 下一步技术判断

停止在同一虚构样例上追加付费协议试跑；日常 reader/独立意见/显式线索机制已能使用。不要继续以排版、文档数量或测试数量代替产品验收。

本地工程基线收口后，下一项适合先做**离线接入差异设计**：只在夜航仓库列出未来适配器要提供/接收/拒绝的字段、缺失降级和未对接项，使用独立虚构样例；核心接口已有合同，不重新造人格、真实记忆或任务系统。尚未开始实现 Asteria 适配器，也不启动任何新的费用或私人材料处理。如需进一步真实模型质量采样，另备具体候选、样例与限额，确认后再做。

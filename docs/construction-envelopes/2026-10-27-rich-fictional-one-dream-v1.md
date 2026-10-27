# NV-RICH-FICTIONAL-ONE-DREAM-01 · 单次真实内容样本准入

状态：两段式权威包。当前只授权 Phase A 离线准入实现与证据；Phase B 真实调用尚未批准。不得把本包存在、用户要求继续施工或旧许可解释为付费授权。

固定实现基线：#105@621074a9a57772d957e43bed8d26ea7fae3a0561，tree 52da581c13f3d771a74a41c08b5a7c4319baf6e5。其父链包含 #101 生成式 wake、#103 阅读器与 #105 输入探针，均保持 Draft、未合并。先回读适用 AGENTS.md、V1 Closure Plan、本包与 #105 验证；识别已有同包任务，禁止重复或并发启动。Phase One 继续冻结。

## 产品问题与完成线

已有证据证明一段含关系与未完成动作的虚构素材会进入 scene/0、scene/1、wake/2，但 fake 输出不能回答内容质量。最终目标是一场且仅一场真实模型生成：两幕原梦 + 逐字醒来残片 + 可选刚醒心情；随后由总控按画面、变化、情绪依据和醒后余留人工阅读，不自动重试，不把测试通过当作内容通过。

本包不为“噩梦”定向。允许温暖、安静、古怪、失落、错过、无法确认或无明显情绪；不得强制恐怖、悲剧、恋爱、意义或积极结局。

## 固定虚构输入

唯一 source 文本逐字固定为：

“两个虚构人物曾在雨停后走过一条小街。一个人轻敲杯沿两下，说有件事下次再讲；另一个人保留了一张折过的车票，票面日期后来模糊了。除此之外没有关于两人关系、那件事的内容或后来结局的资料。”

materialKind=fictional，isRealityFact=false。它不是糯糯、沈述或任何现实人物的记忆。memory=present 且只引用该 source；background=unavailable，affect=absent，mind=denied，intents=stale。不得追加现实背景、关系标签、情绪结论或隐藏提示。

## 当前价格快照与硬上限

价格来源只认 DeepSeek 中文官方文档：
https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
2026-10-27 回读的 deepseek-flash 高峰价：缓存未命中输入 2 元/百万 tokens，输出 8 元/百万 tokens；空闲时段更低。模型别名当前指向 DeepSeek-V4.1-Flash-1017，但别名可变，Phase B 前必须重新核对。

每次完整序列化请求体不得超过 16,384 UTF-8 bytes；每次 max_tokens=400；最多 3 次调用；禁用 thinking、工具、Search/Fetch、流式、重试与修复调用。按最保守的 1 byte/token 本地上界，高峰缓存未命中三次输入上界 49,152 tokens，输出上界 1,200 tokens，合计 107,904 micro-CNY。新 allowance 的绝对总上限为 120,000 micro-CNY（0.12元）；任何价格、模型、请求字节、调用数或货币身份不匹配均失败关闭。

## Phase A · 当前授权范围

建立独立的新协议/执行/授权身份，允许复用已验证的通用组件，但不得改写或放宽旧身份。要求：

1. 新路径固定 deepseek-flash、非思考 JSON、两幕 + 一次 wake，共三次调用；第三次沿用 #101 的 firstFeeling 语义，省略/present/absent/uncertain 均合法，显式无效字段整阶段失败且不重试。
2. scene/1 必须收到完整 scene/0 和 previousAffect；wake 必须收到两幕及 previousAffect。source 在三次请求中逐字存在，sourceRefs 一致。
3. 请求在凭据供应及任何 dispatch 前完成：固定输入、源码/协议/提示身份、模型别名快照、价格、16,384-byte 上限、400-token 上限、三调用/0.12元总预算、旧历史不变、专用 Store 路径与空白新账户校验。
4. 使用新的独立临时 Store 完成 fake rehearsal；捕获实际三次请求，覆盖 present/省略/无效 firstFeeling、超请求字节、价格或源码漂移、取消晚到、settled committed prefix 与无自动重试。
5. 旧付费入口在新源码下继续失败关闭；旧许可、清单、账本、unknown holds、用户 Store 与历史梦不迁移、不释放、不修改。新授权不得依赖刷新旧 pin。
6. 新 live launcher 在 Phase A 只能证明“入口锁住”：没有本包后续 R1 精确放行记录时，在读取 Key、创建真实 owner.lock、供应凭据或网络请求之前返回明确 refused。不得提供通用任意 source、任意 Store 或任意模型入口。
7. Phase A 不读取用户 Key、环境变量、凭据存储、真实 Store或余额，不发网络请求。测试使用 sentinel credential supplier 并断言调用次数为 0。
8. 生成成功后的受管理提交必须同时保存两幕、wake、可选 firstFeeling、完成状态和三笔实际计费状态；不能先 completed 后补心情。后来回想保持空，需以后显式追加。
9. 提供只读提取命令，未来 Phase B 完成后输出：固定输入身份、两幕原文、逐幕 appraisal/before/delta/after 与证据、wake fragment/basis、firstFeeling 状态与文字、associations、simulated residue、三笔 usage/charge。人类梦簿主线不显眼展示模型名。

Phase A 允许新增专用 src/ 或 scripts/nv-rich-fictional-one-dream-01/ 模块、测试和 docs/validation；尽量复用 #101 的生成式 wake 合同，不复制一套不同语义。不得为了避开 source identity 把运行逻辑藏进未纳入新清单的目录。所有实际执行 blob、提示文本、固定输入、价格合同、launcher 与归一化器都纳入新 identity。

## Phase A 验收与终点

运行专用定向、#101/#103/#105 相关测试、新旧付费失败关闭检查、完整 npm.cmd test 与 git diff --check。保留真实命令、环境、退出码、失败与修复；结构测试不得宣称语义质量。范围内普通失败连续修复，只有必须改旧历史、放宽门禁、超过预算/调用数、使用真实凭据或网络才 STOP。

提交并推送独立实现分支，创建 stacked Draft PR，base codex/nightvoyage-fictional-source-probe-01@621074a9a57772d957e43bed8d26ea7fae3a0561。回执状态只能是 READY_FOR_EXPLICIT_LIVE_APPROVAL、BLOCKED 或 TOTAL CONTROL DECISION REQUIRED。列 HEAD/tree、源码与协议 identity、价格快照、最坏费用、测试实数及 launcher 的零凭据/零网络拒绝证明。保持 Draft，不 ready、不合并、不部署。

达到 READY_FOR_EXPLICIT_LIVE_APPROVAL 后立即停止。不要读取 Key、查看余额、创建真实运行 Store、运行模型或自动续开新包。

## Phase B · 保留在同一包，当前未授权

只有总控把包含精确 Phase A HEAD/tree、模型/价格快照、固定请求身份、120,000 micro-CNY 上限、专用 Store 目录、一次 run/三次 call 和无重试条款的 R1 追加到本权威文件后，才允许恢复同一 worktree/分支执行一次。聊天里的“继续”“安排”“跑一下”、旧付费确认、PR 状态或本地有 Key 均不构成 Phase B 放行。

获批后也只能：
- 从私密一次性管道读取一次 Key，不持久化、不打印、不继承环境；
- 新建专用 Store 并执行一个固定 run，最多三次实际请求；
- 无论成功、内容不好、字段失败、超时、取消或账务 unknown，均不重试；
- 立即撤销新授权，关闭 Store，保存真实账务与只读内容回执；
- 不修改原梦、旧账、用户 Store，不生成后来回想；
- 回执交给总控人工评审后停止。

## 人工内容裁决

真实结果只按可见文本记录：
- 是否出现至少一个具体、可记住且不是照抄输入的画面；
- 第二幕是否产生新的动作、阻碍或后果，而非只换位置复述；
- 情绪数值是否有同幕文本证据，UNKNOWN 占位不冒充感受；
- fragment 是否逐字；firstFeeling 是否独立、简短，且没有代写现实用户心情；
- 读完留下的意象是什么，因果或情绪仍空在哪里。

一场样本可以通过、失败或不确定。任何结果都不授权第二场，也不自动改提示、接真实记忆、实现持续余韵或合并 PR。

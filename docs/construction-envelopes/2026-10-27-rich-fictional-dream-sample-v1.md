# NV-RICH-FICTIONAL-DREAM-SAMPLE-01 · 三场真实内容样本准入

状态：两段式权威包。当前授权 Phase A 离线实现与证据；Phase B 真实调用须在 Phase A 身份固定后由总控追加精确 R1。不得把旧许可、PR 状态或普通“继续”当作运行许可。

固定基线：#105@621074a9a57772d957e43bed8d26ea7fae3a0561，tree 52da581c13f3d771a74a41c08b5a7c4319baf6e5。父链包含 #101 生成式 wake、#103 阅读器与 #105 输入探针，均保持 Draft、未合并。先回读适用 AGENTS.md、V1 Closure Plan、本包及 #105 验证；发现同包任务时不重复或并发启动。Phase One 继续冻结。

## 产品目标与 DONE LINE

以同一份固定虚构素材生成三个互相独立的候选梦。每场为三幕原梦加一次 wake，共 3 runs / 12 calls。这样检查模型是否会在相同关系素材上产生可观察的不同动作、后果与醒后余留；不要求三场题材不同，也不挑最好的一场掩盖失败。

允许安静、温暖、古怪、失落、错过、无法确认或无明显情绪。不得强制恐怖、悲剧、恋爱、意义、冲突或积极结局。每场完成后都保留，不因质量差重试。

## 固定虚构输入

唯一 source 文本逐字固定为：

“两个虚构人物曾在雨停后走过一条小街。一个人轻敲杯沿两下，说有件事下次再讲；另一个人保留了一张折过的车票，票面日期后来模糊了。除此之外没有关于两人关系、那件事的内容或后来结局的资料。”

materialKind=fictional，isRealityFact=false。它不是糯糯、沈述或现实人物的记忆。memory=present 且只引用该 source；background=unavailable，affect=absent，mind=denied，intents=stale。三场使用完全相同的 snapshot 和独立 request/run 身份，不追加关系、情绪或结局提示。

## 价格与硬上限

唯一价格来源：
https://api-docs.deepseek.com/zh-cn/quick_start/pricing/

2026-10-27 观察值：deepseek-flash 高峰缓存未命中输入 2元/百万 tokens，输出 8元/百万 tokens；空闲时段更低。当前别名指向 DeepSeek-V4.1-Flash-1017，但别名可变，Phase B 前必须重新核对。

每次完整序列化请求体 <=16,384 UTF-8 bytes；每次 max_tokens=400；每场 3 scene + 1 wake；总计最多 3 runs / 12 calls；禁用 thinking、工具、Search/Fetch、流式、重试与修复调用。按 1 byte/token 的本地保守上界，高峰缓存未命中输入最多 196,608 tokens，输出最多 4,800 tokens，最坏费用 431,616 micro-CNY。新 allowance 绝对上限 480,000 micro-CNY（0.48元）。价格、货币、模型、请求字节、run/call 数或输出上限不符时失败关闭。

## Phase A · 当前施工授权

建立新的独立协议、执行、授权、价格合同与源码 identity：

1. 每场固定三幕与一次 wake；scene/1 收到 scene/0，scene/2 收到前两幕，wake 收到三幕，均带 previousAffect 与唯一 source。不得把旧两幕协议原地改义。
2. scene 使用既有证据语义：appraisal 与 affect 需同幕逐字依据；UNKNOWN 0.5 保持占位。wake 采用 #101 firstFeeling 的省略/present/absent/uncertain 语义，fragment 必须逐字来自三幕之一。
3. 第三幕应继续一个正在发生的瞬间，并允许动作、阻碍或结果出现；提示不得要求高潮、悲剧、疗愈或解释，也不得要求照抄素材。三场系统提示及参数必须一致。
4. 在凭据供应及任何 dispatch 前，校验固定输入、提示/协议/源码 identity、模型别名与价格、16,384-byte 请求上限、400-token 输出上限、3 runs/12 calls/0.48元预算、独立专用 Store 和旧历史不变。
5. 使用临时 Store 与 fake simulator 完整排练三场；捕获 12 个实际构造请求。覆盖合法 firstFeeling 四态、无效字段、超请求字节、价格/源码漂移、取消晚到、每场前缀恢复、跨 run 不串 scene/sourceRefs、预算第 13 次失败及零自动重试。
6. 新 live launcher 在 Phase A 必须失败关闭：没有本包后续精确 R1 时，在读取 Key、创建真实 owner.lock、供应凭据或网络请求之前返回明确 refused。测试以 sentinel supplier 证明调用 0。
7. 不读取用户 Key、环境变量、凭据存储、真实 Store或余额，不发网络请求。不得提供任意 source、任意 Store、任意模型或任意 run 数入口。
8. 每场的三幕、wake、可选 firstFeeling、完成状态与四笔账务须在受管理发布关系中一致；后来回想为空。某场失败不触发重试，也不得自动启动替代 run。
9. 提供 Phase B 后可用的只读总回执：按 run 顺序列固定输入身份、三幕原文、逐幕 appraisal/before/delta/after 与证据、wake fragment/basis、firstFeeling、associations、simulated residue、四笔 usage/charge。三场全部展示，不能只选一场。主阅读面不突出模型名。
10. 旧付费入口继续失败关闭；旧许可、清单、账本、unknown holds、历史梦与用户 Store不迁移、不释放、不修改。新执行所有相关 blobs 纳入新 inventory/identity，不能把逻辑藏到清单外。

允许新增专用 src/、scripts/nv-rich-fictional-dream-sample-01/、测试与 docs/validation。优先复用已验证组件，但不得复制出语义漂移的 wake/记录实现。若必须放宽旧门禁、修改旧历史或无法隔离新身份，STOP。

## Phase A 验收与写入终点

运行专用定向、#101/#103/#105 相关测试、新旧付费失败关闭检查、完整 npm.cmd test、git diff --check。证据记录命令、环境、退出码、失败与修复；结构测试不得宣称语义质量。

在固定 #105 上建立独立 worktree/实现分支，commit/push 并创建一个 stacked Draft PR，base codex/nightvoyage-fictional-source-probe-01@621074a9a57772d957e43bed8d26ea7fae3a0561。交付状态为 READY_FOR_EXPLICIT_LIVE_APPROVAL、BLOCKED 或 TOTAL CONTROL DECISION REQUIRED，列 HEAD/tree、协议/提示/inventory identity、价格快照、最坏费用、测试实数及 launcher 零凭据/零网络拒绝证明。

达到 READY_FOR_EXPLICIT_LIVE_APPROVAL 后立即停止。保持 Draft；不 ready、不合并、不部署、不读取 Key、不查看余额、不创建真实运行 Store、不执行模型、不自动续开任务。

## Phase B · 同一包后半段，当前锁定

Phase A 交付后，总控依据本次对话中糯糯“刚充值，让它多干活”的授权意图，仍须把精确 Phase A HEAD/tree、协议/提示/inventory identity、复核后的价格、专用 Store 路径、3 runs/12 calls、480,000 micro-CNY 上限与无重试条款追加为 R1，才能恢复同一 worktree。没有该 R1 一律拒绝。

获批后只允许一次批次：
- Key 仅由私密一次性管道供应一次，不持久化、不打印、不继承环境；
- 新建专用 Store，按固定顺序执行三个 run，每场最多四次请求；
- 任一结果都不重试、不替换、不加第四场；已成功的梦保持原样；
- 完成或失败后撤销新授权、关闭 Store，保存真实账务与逐场只读回执；
- 不修改旧梦/旧账/用户 Store，不生成后来回想；
- 交回总控人工内容评审后停止。

## 人工内容裁决

逐场记录：
- 是否有具体且不是照抄输入的可记画面；
- 三幕是否出现新的动作、阻碍或后果；
- 情绪数值是否有同幕文本依据，UNKNOWN 不冒充感受；
- fragment 是否逐字，firstFeeling 是否独立且没有代写现实用户；
- 留下的意象是什么，因果或情绪仍空在哪里。

最后比较三场的一致问题与偶发差异。三场可以全部失败或不确定；测试通过不能替内容通过。本批次不授权继续生成、改提示、接真实记忆、实现持续余韵或合并任何 PR。

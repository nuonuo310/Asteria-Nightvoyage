# Asteria-Nightvoyage · 夜航

独立运行的实验性梦境层：获准的虚构快照 → 最多两幕梦境及模拟情绪 → 独立醒来残片与余韵 → 带来源身份的字面线索召回候选。Node.js 24+／JavaScript，MIT，无运行时依赖。

**当前状态：第一阶段本地工程闭环已有实现与有界证据；梦境总体质量尚未验收，Asteria 适配待对接。** 梦境事件始终不是现实事实；不会写入真实记忆、人格或任务，也不会执行梦中文字中的现实工具指令。当前仅支持虚构素材。

[第一阶段收口核对](docs/PHASE-ONE-STATUS.md)逐项区分代码、机制测试、用户实机回报和未完成事项；[进度记录](PROGRESS.md)保留历史切片与限制。下方是当前入口，早期模块文档中的“本轮未支持”描述仅适用于其当时切片，不能替代当前状态。

[未来适配器差异设计](docs/ADAPTER-BOUNDARY-DESIGN.md)区分现有本地合同与未接通的权限、版本、接收确认和外部撤回；附独立虚构快照与现有 API 演练。不是 Asteria 兼容声明，也不启用新生成许可。

[本地端口适配器](docs/LOCAL-DREAM-PORTS.md)提供版本化的固定假模型入口，统一显式输入、控制、保存和候选 API；专用付费 Store 不接管。运行 `node scripts/check-local-dream-ports.mjs` 可做独立临时虚构演练；Asteria 仍待对接。

## 模型入口与当前施工

正式目标默认 **ChatGPTPlanAdapter**，订阅备用 **CodexAdapter**；开发和自动测试默认 **FakeAdapter**。新的 [DreamModelPort](docs/DREAM-MODEL-PORT.md) 已有持久 Fake 闭环和显式 API 兼容演练；无显式会话时两种订阅 adapter 均关闭。用户已执行受限 GPT 订阅请求，最新整流预算试跑在第一幕遇到未支持事件后停止，未保存梦；成功推理资格和梦境质量仍未确立。见[最新拒绝事件分类与不确定性](docs/REJECTED-RESPONSE-EVENTS.md)、[此前事件上限复现](docs/ENVELOPE-EVENT-BUDGET-REVIEW.md)及[较早的输出结构对照](docs/PLAN-OUTPUT-SHAPE-REVIEW.md)。Codex 原生入口仍待对接。[显式模拟协议演练](docs/SUBSCRIPTION-MODEL-PORT-REHEARSAL.md)不代表真实推理成功。[只读盘点](docs/DREAM-MODEL-PORT-INVENTORY.md)保留当时基线与调用链。

同一 run 在 start 时固定 adapter/model/protocol；fallback 仅在零外部调用的 preflight 按明确策略选择 GPT → Codex，不能在首幕后换入口或拼接结果。DeepSeek/API 历史能力保留在显式 legacy 边界，不静默默认、不新增费用许可。Asteria 两座桥仍待对接，不在夜航实现。

[整流事件预算离线候选](docs/OFFLINE-AGGREGATE-ENVELOPE.md)已用独立虚构流覆盖两层计数问题：统一有限事件预算，保留 64 KiB 整流与 1,200 字节最终 JSON 上限，完整结束后才返回答案。仅接假模型闭环，未替换真实入口、消费新许可或证明 GPT 梦境质量。

[独立整流预算试跑入口](docs/GPT-PLAN-AGGREGATE-ENTRY.md)使用新协议和新许可，最多一场虚构梦、三次 GPT-5.6-Sol 订阅请求；每条流最多 1,024 个事件，字节上限不变。已有模拟登录/HTTP/持久化演练；随后用户实测 1 次请求、零保存，遇到 `unknown_event` 后停止，该许可已消耗。旧记录保持原样；[独立单次拒绝事件诊断](docs/PLAN-REJECTED-EVENT-DIAGNOSTIC.md)已有本地模拟登录与 HTTP 核验，最多一次请求、只留固定类别、不保存梦境正文。用户随后实测一次，结果为 `unreviewed_event`，该诊断许可也已消耗，未保存梦。[覆盖审计](docs/UNREVIEWED-EVENT-COVERAGE.md)已离线复现其歧义；新的[事件定位合同与独立单次入口](docs/EVENT-WITNESS-DIAGNOSTIC.md)已实现目录内固定编号和目录外明确停止；用户随后实测一次，遇到目录外事件后停止，该许可已消耗。详见兼容停止记录；不自动重试或改走 API。

`node scripts/check-dream-model-port.mjs` 只运行独立虚构临时样例，不登录、不读取凭据、用户梦簿或请求真实模型。

最新用户回报触发了[目录外事件兼容停止](docs/GPT-SUBSCRIPTION-COMPATIBILITY-STOP.md)，该诊断已消耗；直接 GPT 仍是目标首选，但暂停新的真实试跑。Codex 备用现已有[完整 RPC 顺序的离线演练](docs/CODEX-RPC-REHEARSAL.md)，可运行 `node scripts/check-codex-rpc-rehearsal.mjs`。它仍不启动 Codex 进程、不登录、不证明工具禁用或订阅可用，也不接续旧失败梦。

随后已加入[独立 Node 子进程管道演练](docs/CODEX-PIPE-REHEARSAL.md)，运行 `node scripts/check-codex-pipe-rehearsal.mjs` 可验证真实本地 stdin/stdout、退出与持久重放；子进程是假服务，仍未启动 Codex 或调用真实模型。下一步需核对本机 Codex 安装版本，再审查原生配置与工具排除，不能把管道通过说成订阅接通。

已补上[原生隔离配置观察](docs/CODEX-ISOLATION-CONFIG-REVIEW.md)：Linux 原生进程回显了显式关闭值，检查器只输出固定标签。配置匹配仍不等于实际工具排除，Codex 真实推理继续关闭；本次不需要用户登录或粘贴凭据。

[启动错误流诊断](docs/CODEX-STARTUP-DIAGNOSTICS.md)已支持在进程退出前识别短错误，只保留固定标签。原生对照暴露并消除了特定 PATH/废弃设置告警，但线程准备超时仍未解决；这不是订阅推理通过。

现有[仅元数据进程核验入口](docs/CODEX-NATIVE-METADATA-OWNER.md)：`node scripts/check-codex-native-metadata.mjs` 默认启动独立假进程；只有显式提供原生可执行文件才核对本地 Codex。入口不包含登录和生成回合。Linux 原生对照仍停在线程准备超时，Windows 结果待本机核验；`metadata_prepared` 也不表示订阅推理可用。

## 日常查看已有梦簿

在仓库目录执行：

```sh
node scripts/dreambook.mjs list
node scripts/dreambook.mjs read --latest
```

list 只显示无正文目录；read 显式在本地终端显示最后一条可见原梦、醒来残片、模拟评价和分别署名的独立意见。latest 按持久插入顺序，不编造创建时间。中文状态解释不改写备注；追加 --review-json 可查看完整评审绑定。没有已有 Store 就停止，不创建新账户。详细路径、协议与恢复边界见[梦簿阅读器](docs/DREAMBOOK-READER.md)。

阅读不调用模型、不需要 Key、不产生新评审。Store 启动锁与日志恢复可能写入文件，不声称整个生命周期零写入。终端中显示的正文属于本地梦簿内容，不必贴回公开仓库。

## 开发与独立虚构演练

```sh
npm test
node scripts/check-chatgpt-plan-trial.mjs
node scripts/check-dreambook-reader.mjs
node scripts/check-daytime-cues.mjs
node scripts/check-local-appraisal-review.mjs
```

Windows PowerShell 若阻止 npm.ps1，使用 npm.cmd test。上述 check 脚本仅使用自己的临时虚构 Store，不读取用户梦簿，不读取凭据或请求真实模型。虚拟白天演练是显式线索和虚拟时间，不是后台监听、语义检索或自动投递。

验证按切片保留在 PROGRESS.md 与 docs/validation；最新协议候选见[离线响应封装验证](docs/OFFLINE-PLAN-ENVELOPE.md)。以下为历史证据：首次订阅入口合成 OAuth/HTTP 完整951/951、定点83/83，当时尚未发起真实订阅请求；此前模型端口模拟协议920/920、登录历史879/879。用户 Windows 阅读器针对测试11/11；Windows 完整回归先为854/855，修正旧 bootstrap 测试预期后回报855/855，见[修正与历史记录](docs/WINDOWS-BOOTSTRAP-ASSERTION.md)。这些用户统计不声称工作台独立验证。假模型或协议测试不是生成质量验收。最初阶段范围见[第一阶段状态](docs/PHASE-ONE-STATUS.md)。

需要学习最初假模型接口，可看[虚构流程](docs/WALKTHROUGH.md)及 src/cli.js。创建实验数据必须使用源码仓库之外的绝对目录；不要为绕过历史额度、unknown 占款或去重状态而新建账户/目录。

## 真实模型与批准边界

**最终接入优先级（用户决定，2026-10-18）：优先使用 GPT 订阅通路。** 已核对官方 Sign in with ChatGPT 开源 plan usage 路线，并实现[离线请求与流式协议准备](docs/CHATGPT-PLAN-ENTRY.md)；[本机登录核对](docs/CHATGPT-PLAN-LOGIN.md)已实现，用户已回报Windows身份/scope/目录核对成功并撤销本次会话；真实推理资格与用量设置仍未核实。新的[首次订阅虚构梦入口](docs/CHATGPT-PLAN-FIRST-DREAM.md)已有合成HTTP闭环，真实运行待明确批准。该路线不支持原400 token服务端上限，替代限制已获用户确认，实际生成仍须核对官方应用用量/积分设置。不将订阅自动视为 API 凭据/余额，首次候选显式固定gpt-5.6-sol；不能接通时暂停说明，不自动回退至新增 API 或 DeepSeek 计费调用。现有 DeepSeek 试跑保留为机制验证与历史记录，不构成最终首选或新额度。

已存在专用、合同绑定的 DeepSeek 付费入口。用户此前明确批准的一次 inline 虚构运行完成两幕与醒来，后续读取、无凭据重放和手动字面召回有用户实机回报；[单样本结果及限制](docs/INLINE-LIVE-TRIAL-RESULT.md)单独记录。不能把早期“尚无真实入口”的切片说明当作当前事实。

**当前没有批准新的付费运行。** 已完成许可受调用/运行上限约束，剩余金额不授予下一梦。价格、固定候选、虚构外发、凭据和费用须在下一次真实阶段重新核对并明确确认；不自动重试、扩额、续期或释放旧 unknown 占款。历史占款是保守会计状态，不是独立核验的供应商实际账单。

[专用付费进程](docs/INLINE-PAID-PROCESS-ENTRY.md)、[授权保存](docs/INLINE-TRIAL-AUTHORIZATION.md)及[受控依赖边界](docs/INLINE-LOCKED-PREREQUISITES.md)说明机制；阅读这些说明或运行离线测试不构成付费授权。旧协议、固定源码与旧批准不因安装新版本而自动兼容。

## 合同、保存与后续范围

- [输入、输出、控制与保存合同](docs/CONTRACT.md)：五通道快照、降级、独立产物、来源版本/权限、取消、恢复和撤回；未来 Asteria 提供同一规范化快照的实际接口尚不存在。
- [原始分阶段计划及现状](docs/PLAN.md)：A 文档、B 本地闭环、C 可靠性、D 真实阶段单独决策。
- [虚拟白天线索](docs/DAYTIME-CUE-SIMULATION.md)：字面候选、去重、过期、时钟与交付边界。
- [独立评审 CLI](docs/LOCAL-APPRAISAL-REVIEW-CLI.md)：明确提交的意见与原梦分别保存，不自动充当人工验收。
- [质量评估](docs/QUALITY-EVALUATION.md)与[有限内容评审](docs/INLINE-CONTENT-ASSISTANT-REVIEW.md)：结构/字面引文不等于情绪方向、精确幅度或总体质量已成立。
- [公开参考与许可证核对](docs/REFERENCES.md)：仅借鉴思路，无第三方实现复制；未来复制仍须文件级许可审查与明确确认。

原梦、醒来、后来回想、想象续写和评审分别保存；珍藏、召回访问、梦中情绪及醒后余韵分别管理。来源撤回立即屏蔽并清除受管理的关联正文，重开恢复不能重新暴露。保证范围仅单机受管理 Store、日志和临时文件；外部备份恢复、已返回副本、终端历史、供应商留存或物理擦除不受此保证。

公开仓库只包含独立表述、代码和虚构样例。不得提交真实聊天、私人记忆、梦簿/state.json、私有仓库原文、私人配置或密钥。尚无前端、Asteria 实时接入、真实素材支持或自动日间投递。

GPT订阅首次试跑的用户回执为首幕校验失败、未发布梦境；已补充[固定响应诊断与只读历史入口](docs/GPT-PLAN-RESPONSE-DIAGNOSTICS.md)，旧响应原因仍未知，未安排重试。

已准备[GPT订阅单次响应诊断](docs/GPT-PLAN-SINGLE-RESPONSE-PROBE.md)：独立批准、最多一次调用、不保存生成正文；真实执行尚未批准或核验。

零生成调用的网络失败可使用[一次显式接续](docs/GPT-PLAN-ZERO-CALL-RECONNECT.md)：原失败对象与期限保持不变，先公开网络预检，原诊断及接续累计最多一次生成；无自动重试。

用户回报订阅接续在HTTP 200的Content-Type检查处拒绝；[官方约定复核与离线返回类型分类](docs/PLAN-HTTP-ENVELOPE-REVIEW.md)已完成，实际类型和根因仍未知，未放宽正式接受规则或追加真实调用。

已完成[独立追加一次的HTTP元数据诊断入口](docs/GPT-PLAN-ENVELOPE-PROBE.md)及合成核验：只保留固定返回类型/结构/错误码，不保存正文、不发布梦。须另行明确批准一次新增订阅请求；当前尚未真实运行，旧许可不会复用。

用户随后报告该诊断得到 HTTP 200、Content-Type 缺失或为空、正文超过 8 KiB 检查上限；许可已消耗，仍未接受梦境推理。[结果边界与离线前缀分类](docs/PLAN-HTTP-MISSING-TYPE-REVIEW.md)已记录；该离线切片未新增请求。

现已完成[独立有界前缀诊断入口](docs/GPT-PLAN-PREFIX-PROBE.md)：未提供类型时只读取前 8 KiB 并保存固定前缀标签，不接受梦境推理；假响应测试通过，尚未真实运行。任何新增订阅请求仍需单独明确批准。

用户随后报告缺失类型头的响应具有 SSE-like 前缀；仍未验证完整流。[缺类型头的完整流兼容候选](docs/GPT-PLAN-MISSING-TYPE-CANDIDATE.md)已用独立虚构数据跑通两幕与醒来，保留全部完整解码和梦境校验；当前仅离线模拟，尚未接入真实 transport，没有新增真实请求。

后续已完成[独立版本的兼容试跑入口](docs/GPT-PLAN-MISSING-TYPE-ENTRY.md)：原有 transport、许可和回执保持不变，新入口用虚构授权／HTTP 跑通持久化闭环，梦簿支持新协议。真实账户尚未核验；一场新梦（最多三次订阅调用）须另行批准，不自动重试、切换或使用付费 API。

用户随后批准并执行该兼容入口：一次请求后返回 `plan_output_shape`，未保存第一幕，授权撤销已确认，许可已消耗。该错误涉及多个拒绝分支，不能据此确认历史根因。[离线封装候选](docs/OFFLINE-PLAN-ENVELOPE.md)可在结构校验后丢弃推理内容，并继续要求唯一完整文本、模型、用量及梦境阶段校验；尚未接入真实 adapter 或持久化生命周期，不请求再次登录，也不复用旧许可。以上旧条目是各阶段历史状态，以本段与顶部当前状态为准。

随后已补[模拟适配器与持久化生命周期](docs/OFFLINE-ENVELOPE-LIFECYCLE.md)：两幕加醒来、检查点恢复、去重、预算、取消、来源撤回与梦簿读取均有独立虚构测试。运行 `node scripts/check-offline-envelope-runtime.mjs` 可复核仓外临时闭环；默认仍是假模型，无真实 transport 或新许可，不登录、不读取用户梦簿，也不证明生成质量。上一段“未接入持久化”是该协议切片当时状态。

[原生封装组件](docs/ENVELOPE-NATIVE-COMPONENTS.md)随后已用合成 OAuth／HTTP 跑通两幕与醒来，复用固定公共 HTTP transport；`node scripts/check-envelope-native-components.mjs` 仍仅用虚构响应，不访问真实账户。独立持久授权入口、精确诊断、通用阅读器接入及 CLI 整体核验仍待完成，当前没有新试跑许可或可执行真实试跑命令。GPT-5.6-Sol 的真实请求发起过，但尚无通过校验并保存的梦。

后续已实现[独立完整封装试跑入口](docs/GPT-PLAN-ENVELOPE-ENTRY.md)，补齐新许可、失败前序绑定、固定错误标签、终态重放和通用阅读器核验。`node scripts/check-envelope-plan-entry.mjs` 只跑独立虚构授权／HTTP 演练；真实账户尚未验证，也没有新的真实用户许可。旧失败梦保持停止，固定 GPT-5.6-Sol 的新梦（最多三次订阅调用）必须另行明确批准，不能靠重复旧指令启动。上一段为原生组件切片当时状态。

已实现 [Codex 本地请求工具观察器](docs/CODEX-LOCAL-REQUEST-OBSERVER.md)：默认只跑独立虚构进程；原生观察须显式指定程序，只连接无认证的本地虚构服务，不授予订阅推理权限。实际原生工具列表尚未取得。

本地 Codex 观察新增[显式虚构型号目录模式](docs/CODEX-FICTIONAL-CATALOG-OBSERVER.md)：用于比较元数据回退警告；自动测试通过，Windows 原生比较待运行，订阅生成仍未开放。

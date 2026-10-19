# DreamModelPort v1

本轮交付中立阶段合同、复用既有生命周期的持久 Fake 执行器，以及旧 API 客户端的显式兼容适配演练。正式目标默认 **ChatGPTPlanAdapter**，订阅备用 **CodexAdapter**，自动测试默认 **FakeAdapter**。前两者默认正式模式仍关闭，**没有可用的真实生成执行器**。后来切片已补显式独立 simulator 的[协议演练](SUBSCRIPTION-MODEL-PORT-REHEARSAL.md)，其身份是 synthetic_stub，不是订阅可用。

## 最小合同

`identity` 是固定元数据：`adapter_kind`、`provider_kind`、`model_id`、`auth_mode`、`protocol_version`。`unknown` 表示未确定；不是认证成功或免费声明。`capabilities` 声明是否属于外部生成、阶段 schema。`preflight()` 仅返回本地 readiness / 固定 reason，当前不读取账号、目录或凭据。

`generate(request, {signal})` 返回 Promise：

```js
{
  contract_version: 'dream-model-port-v1',
  request_id: 'stage-fictional-run-scene-0',
  run_id: 'fictional-run',
  stage: 'scene', // 或 wake
  index: 0,
  snapshot: approvedImmutableSnapshot,
  scenes: previouslyCommittedScenes
}
// 响应：{ value: normalizedStage, usage: 'unknown' }
// 或 usage: { input_tokens, output_tokens, total_tokens }
```

请求只有固定字段，可选 `stage_schema` 明示兼容 schema。普通端口使用项目自有 inline evidence 阶段规则，与具体模型名无关。适配器把自己的 wire 规范化；执行器再次验证 canonical scene / grounded wake，不让供应方自填来源或事实身份。返回对象是分离副本；输入 getter、非 JSON 数据、未知字段及不可能的幕号被拒绝。工具、provider thread、OAuth/API 凭据不属于阶段请求。

- Scene 是结构化事件、评价、before/delta/after、引文依据和模拟情绪声明。字面依据不等于语义支持或精确情绪幅度通过。
- Wake 是对已保存场景的逐字残片、独立 residue 初值及最多一条联想；允许没有启示。
- 梦簿来源由执行器根据获准快照写入，`materialKind` 与 `origin` / `isRealityFact:false` 分开。梦、醒来、余韵、回想、想象续写不互相覆盖。
- 统一用量只容纳供应方实际给出的非负整数 token 或 `unknown`。Fake 默认 unknown；测试里另有合成计数，不代表真实账单。
- 固定错误分类包含 authorization_required、adapter_unavailable、budget_exhausted、cancelled、timeout、ambiguous_attempt、invalid_model_response、source_withdrawn、storage_io_failure、foreign_execution_owner。未知异常归 invalid_model_response；原核心 error 另保留固定诊断，不保存异常自由文本。

## 选择与固定

`selectAdapter()` 默认 Fake；`selectSubscriptionAdapter()` 表达正式目标路由，默认 GPT，且当前 readiness=false。没有根据环境中的 Key、已安装 CLI 或目录型号静默挑选 API 的逻辑。

fallback 必须显式给出 `fallback_on`。正式路由仅允许 GPT → Codex；Fake → Fake 仅用于独立离线演练。未声明原因、不支持的方向、无 readiness 的备用入口均不启动。当前两种订阅入口都不会因 fallback 变得可用。

选择发生在打开执行 Store 之前，尚无外部生成。选择对象由模块签发，不接受调用者伪造回执。新 run 在 start 时就固定完整 adapter/model/protocol/选择身份，比“第一次外部调用后固定”更保守；本版不提供已排队 run 的改选口。相同 run 不允许换入口、换 model 或换 fallback 来源。需要另一个入口时，必须另作明确授权的新运行，不能自动双跑或拼接两家结果。

一次执行不因失败重新 preflight/fallback。第二幕失败保留首幕，停止；存在未提交尝试时 resume 拒绝。仅有完整已提交 scene 前缀、没有悬空尝试的失败/中断，才允许显式 resume 到同一个 adapter。取消是终态，不能恢复。

## 持久运行与回执

`ModelPortNightvoyage` 继承现有 Nightvoyage 生命周期与 Store，仅替换模型阶段分发、owner 和回执。调用方不需要把模型名、CLI 路径或凭据塞进梦境核心。

回执包含所选 identity、`fallback_from`、`fallback_reason`、`external_calls_started`、`checkpoint`、`usage`。另有 `stage_dispatches_started` 区分 Fake/本地模拟尝试和外部生成。checkpoint 包含保存幕数、醒来是否已保存、最后已提交阶段请求编号。

- 先持久化尝试意图，再调用 adapter；崩溃窗口按模糊尝试处理。未来 external adapter 的 external_calls_started 计入已持久的外部尝试意图，是防重放的保守计数，不能据此声称 HTTP 一定送达。当前实际可运行路径只有 Fake/stub，外部生成计数为0。
- 校验后的阶段、usage 和 committed 状态同一次 Store save；没有保存原始失败响应的调试缓存。
- 重复 request/session 返回原 run；重复完成执行不再调用。来源撤回仍先于正文清理写入日志，重开重施屏蔽；检查点不绕过撤回。
- AbortSignal、超时和当前运行状态共同阻止迟到结果提交。`remote_confirmed:'unknown'` 不因本地 abort 改成成功取消。
- 当前 Fake 配置复用既有 config 字段以兼容生命周期；`inputTokens` / `outputTokens` / `perCallOutput` 在新 Fake 执行器中仅换算成三倍 UTF-8 JSON 字节额度，**不是 token 测量或真实模型预算**。回执明确 units 和 local_json_byte_guards。不得把此估算移用于真实 provider 计费；API 使用原有完整上下文预留和供应方 usage。
- 单 owner、源码之外的 Store、原子文件/日志/临时文件边界沿用。启动恢复可能写入；拒绝旧 owner 不保证整个构造零文件变化。外部备份、已经返回的对象、终端、供应商留存和物理擦除不受受管理 Store 清除保证。

可信本地调用代码可以提供 Fake reply 函数进行故障注入；这不是不可信插件沙箱，不能宣称能阻止任意调用者 JavaScript 自己访问网络或文件。仓库测试只使用独立虚构 reply，不读取环境凭据或用户材料。

## API 兼容边界

`scripts/legacy-api-model-port.mjs` 中 LegacyDeepSeekAdapter 通过同一阶段身份/请求/usage 约定调用现有 GatedDeepSeekClient。兼容 schema 区分旧基础格式与 inline 格式；不为旧事件补造情绪依据。内部 compatibility 元数据只供旧 runtime facade 使用，不混入梦境正文。

`PortBackedApiRehearsal` 复用 BudgetedNightvoyage，把原 send 经过 adapter；原账本 reservation / unknown / settlement / publish 回调完整保留。基础 grounded-wake-v2 与 inline-evidence-v1 均有三阶段模拟证据。新 execution owner 不接管历史专用 run；新边界只接受 stub，live/default 构造在打开 Store 前拒绝。

**D 的当前完成范围是兼容代码接入与模拟验证，不是所有历史付费入口已迁移或重新获批。** 旧 DeepSeek/API 能力没有删除，也没有被选为静默默认。旧专用入口、固定源码清单、批准、期限、额度、占款和用户梦簿保持原状。以后若要把专用 live 入口改接端口，须单独重新核对固定候选与既有批准，不能借这个 facade 绕过。

## 订阅与 Asteria 尚未完成的部分

两种 adapter 现已支持显式 simulator 的离线 generate；默认不提供 simulator 时，ChatGPTPlanAdapter 的 preflight=authorization_required，CodexAdapter 的 preflight=adapter_unavailable，均无真实 generate、网络或 token 加载。GPT 复用无工具 Responses 准备/流解析，Codex 仅有非可分发提案和模拟通知解析；尚无 app-server 启动、授权模式核对、工具禁用证明或真实 turn。

只依据官方 [Sign in with ChatGPT](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)、[Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)、[Codex app-server plan 配置](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)与[app-server 协议](https://learn.chatgpt.com/docs/app-server)继续施工。plan OAuth 转发到 app-server 的路线与 Codex 自己的 ChatGPT 登录不能混称；型号目录不是资格证明，只有真实完成推理才证明当次可用。当前未选择或证明其中的备用认证路线。订阅不保证无积分/额外费用；不能静默使用 API Key。

后续离线工作可补订阅传输/事件演练；真正绑定账号、授权或推理之前暂停，核对登录失败与用量设置。AsteriaModelGateway、Context Bridge、canonical state、真实 Memory/Mind/情绪/人格/意图、自动投递及正式桥实现均不在本仓库。未来桥只提供带来源/版本/权限的固定快照并接收分型候选；provider thread 不是长期记忆。

## 核验

```sh
node --test test/dream-model-port.test.js test/legacy-api-model-port.test.js
node scripts/check-dream-model-port.mjs
node --test
```

只用独立虚构样例与临时 Store。进程真实退出探针覆盖 dispatch 意图与已提交首幕；另覆盖固定入口、明确 fallback、第二次尝试失败、重复、预算、取消/晚到、撤回、存储失败、API 原子账本及 unknown 保留。后续新 owner 的梦簿只读接入及订阅协议演练见 [SUBSCRIPTION-MODEL-PORT-REHEARSAL.md](SUBSCRIPTION-MODEL-PORT-REHEARSAL.md)。详细汇总见 [validation/dream-model-port.json](validation/dream-model-port.json)。这些是机制证据，不是订阅可用、Windows 实机、梦境语义或总体质量验收。


后续状态：GPT端口新增只接受已校验内存会话和显式本机批准的固定HTTP传输，见[首次虚构订阅试跑](CHATGPT-PLAN-FIRST-DREAM.md)。普通无会话adapter仍失败关闭，离线simulator与Fake身份不变；本轮没有真实推理，Codex原生入口与Asteria桥仍待对接。


## 2026-10-20 Codex native boundary status

The earlier statements that no app-server has been started describe the initial adapter slice, not the subsequent separate local probes. User Windows receipts now establish native metadata preparation, an empty declared inventory under the fixed fictional catalogue and one bound selected unsupported interaction call. These probes do not connect to CodexAdapter or qualify real subscription inference. The adapter without an explicit synthetic simulator remains unavailable. The [current admission review and fixed final-answer comparison](CODEX-FINAL-COMPLETION.md) distinguishes those observations from the remaining native transport/authentication, real-catalogue tool controls, process containment and entitlement work. No Asteria bridge or real model turn is claimed.

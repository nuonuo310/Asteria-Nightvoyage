# GPT / Codex 模型端口离线演练

基于 `32b8fded75491330496e23604f5f5893d29735af`，这片把两个显式 adapter 的**模拟协议响应**接到已经提交的 DreamModelPort。`scripts/dream-model-runtime.mjs`、原梦境核心、Store 和历史 API 清单均未修改。

## 已运行的范围

- FakeAdapter、ChatGPTPlanAdapter 和 CodexAdapter 分别完成独立两幕加醒来、保存、重开、完成重放不追加、原梦不变、来源撤回后重开屏蔽。全部素材与供应方响应独立虚构。
- GPT rehearsal 构造原有 `store:false / stream:true`、无工具、显式型号的非可分发草稿，复用既有有界 UTF-8/SSE 解析；只在 response.completed 后规范化阶段和 usage。
- Codex rehearsal 构造非可分发的初始化/输入提案，只解析模拟 NDJSON 通知。thread/turn 只活在单阶段临时 decoder，不保存或作为记忆。只接受完成的权威 agentMessage 和 completed turn，忽略 partial delta 正文；失败、中断、错误、reroute、工具/审批/推理/未知事件、最终 turn 中隐藏工具和冲突 final item 均拒绝。
- Codex transcript 仍是刻意收窄的通知子集，未实现 initialize/thread/start/turn/start 的真实请求响应状态机。当前 tokenUsage 通知尚不规范化，用量明确 unknown，不填0。
- 有界流：65536字节、128事件、最终 JSON1200字节，UTF-8严格解码；CRLF/逐字节中文、截断、畸形、重复完成、超限都有探针。数字不是服务器 token/费用上限。
- 统一执行器继续处理阶段取消、非协作迟到响应、检查点、去重和撤回。GPT preflight 未就绪时，只有明确 policy 才选择可用的 Codex rehearsal；GPT 首幕后失败不会调用已声明的备用 adapter。

## 演练与正式模式的明确区分

两种 adapter 默认没有 simulator，仍失败关闭。只有可信本地代码显式提供独立 simulator 才能演练；没有命令行参数把模拟改成真实调用，也没有 fetch、子进程、Key、OAuth 或 CLI 回退。

演练回执固定 `provider_kind:openai_protocol_simulator`、`auth_mode:synthetic_stub`、独立 offline protocol version、`external_calls_started:0`，与正式目标身份不同，不能用正式 adapter 接管演练 run，也不把模拟完成写成订阅可用。Fake 仍是无配置的测试默认；正式目标仍是 GPT，Codex 备用。

trusted simulator 是测试依赖，不是不可信代码沙箱；任意调用者 JavaScript 的自行行为不在模块隔离承诺中。仓库自检只调用随仓库的虚构 transcript 函数。

## 新 owner 的梦簿读取

复查发现旧阅读器只支持旧协议 owner；已在 scripts 层加入严格的新 owner 读取投影，不伪造 billing/appraisal 协议字段，不改写原梦或旧 API 元数据。Fake 与两种订阅 rehearsal 的保存结果均可由现有 `dreambook.mjs list/read` 读取，校验选择身份、来源、scene chain 与 grounded wake；篡改记录失败关闭，撤回后重开不显示。旧协议读取继续沿用原路径。新 owner 的独立评审写入尚未对接；若发现不支持的评审条目，拒绝读取，不静默隐藏。

## 真实入口仍未完成

本片没有启动 Codex、核对其登录方式或继承本机登录缓存，没有访问 OpenAI 网络、真实账户、用户梦簿或凭据，没有订阅/API推理或新增费用。

尤其是“解析后拒绝工具事件”**不能证明真实 app-server 没有先执行工具**。因此真实 Codex 启动仍由 `blocked_pending_auth_and_verified_tool_disable` 阻断；不能用 read-only sandbox 或没有动态工具列表代替完整工具边界核验。正式后续仍需认证路线、进程隔离/依赖和生效配置核对，不能直接给这个 transcript decoder 接上通用 shell。

直接 GPT 仍需获准登录、签名/scope/身份、明确型号、官方用量设置及真实完成推理核验。此前失败的登录不能升级为可用或确定不符合资格，也不重建连接目录逃过失败。下一次涉及登录/账户授权/真实订阅推理时，先让用户明确允许最小操作；本片没有替用户登录。

AsteriaModelGateway、Context Bridge、canonical state、正式状态写回与两座桥均未实现。梦境质量、情绪方向和幅度、真实远端取消、Windows/native CLI 行为仍未验证。

## 核验命令

```sh
node --test test/subscription-model-port.test.js test/dream-model-port.test.js test/legacy-api-model-port.test.js
node scripts/check-subscription-model-ports.mjs
node --test
```

结果见 [validation/subscription-model-port-rehearsal.json](validation/subscription-model-port-rehearsal.json)。自检不接受参数，使用独立临时 Store，输出仅聚合信息；不需要用户再搬梦簿正文或执行真实调用。

## 公开参考与许可

仅依据官方协议要求独立实现，无第三方实现复制、SDK/运行时依赖新增或私有材料转写：

- [Sign in with ChatGPT / Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [ChatGPT plan / Codex app-server](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)：该文的自有 plan OAuth token 转发模式与 Codex 原生登录模式不同，未认定二者自动兼容。
- [Codex app-server / 事件与 turn 生命周期](https://learn.chatgpt.com/docs/app-server)：以权威 item 和 completed turn 判断，不用目录证明推理资格，不采纳工具/模型 reroute 继续同梦。

项目代码继续 MIT。这里只借公开接口思路，没有复制文档示例实现或第三方源文件。

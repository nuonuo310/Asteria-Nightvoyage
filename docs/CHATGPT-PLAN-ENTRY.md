# GPT 订阅入口：离线协议准备与真实接入约定

本页记录离线协议准备切片；后续已实现[本机登录/型号核对](CHATGPT-PLAN-LOGIN.md)，尚未实现订阅生成执行器。用户已接受替代限制并授权继续接入；下文“待确认”保留该切片当时状态，不替代后续登录文档。

2026-10-18 核对官方文档。首选 Sign in with ChatGPT 的开源、本地应用 plan usage；API 仍是须明确切换的备选。不是抓取网页会话、读取浏览器 Cookie、复用 Codex 私有凭据或调用未公开 backend-api。

## 已实现

scripts/chatgpt-plan-protocol.mjs 只有纯请求构造与增量 UTF-8/SSE 校验，没有 HTTP 客户端、登录、凭据读取、账户探测、费用账本或 Store 写入。prepareChatgptPlanRequest 返回 dispatchAuthorized=false；这是可检视的草稿，绝不是外发授权。

- 复用本项目自己的 inline 场景/引文、前幕检查和醒来摘录语义；不复用 DeepSeek 传输、价格或许可。请求只保留 model、instructions、input 数组、store=false、stream=true，目标是公开 Responses endpoint。
- 型号必须显式给出；测试用 synthetic-plan-model 只是虚构标签，不是可用型号声明。真实型号要从获准账户的当前目录选择，不预设默认 GPT 型号。
- 流式内容在 completed 前不返回；完整正文须是单个 JSON 对象，单条 assistant message/output_text。工具、拒绝、推理条目、失败、不完整及未知事件关闭解码器。首版故意只接受这一窄事件集合；真实服务若返回其他正常事件也会拒绝，须独立审查再支持，不能自动修复或重试。
- 65536 字节请求上限、65536 字节流上限、128 个非注释 SSE 事件、1200 字节最终 JSON 内容上限。允许跨块多字节中文与 CRLF；无损字节边界和畸形 UTF-8 有测试。
- 返回 usage 只保留供应方报告的非负整数 input/output/total；不把字节换算成真实 token，不把未报告 usage 当零。拒绝结果不返回供应方自由文本错误。场景/醒来还须由现有 normalizeInlineStage 进行语义结构和摘录校验。

此层不保证网络时间、取消、撤回、持久去重、调用预算或 crash 恢复；这些必须在未来执行器中完成。它没有开启独立登录或 live 命令，也没有把本地假模型端口升级为真实模型适配器。

## 与旧试跑不同的重大限制

官方当前 preview 不支持 max_output_tokens。请求、流和内容的字节上限不等于服务端 token 上限，超限后中断也不保证服务端立即停止或退还额度。旧 DeepSeek 的每次400 token及CNY预留合同不能平移，也没有被修改。

ChatGPT plan usage 可能使用套餐内用量或积分余额；不承诺永久免费、所有套餐均可用或登录成功即有模型权限。官方文档要求在 ChatGPT 设置中管理应用用量/积分限制。尚未核对用户的资格、应用额度与积分设置，不读取或改变其账户。

## 首次真实试跑拟议约定（尚未批准或启用）

| 项目 | 拟议内容 |
| --- | --- |
| 材料 | 只用公开 sparse-context 虚构样例；原文件仍禁止外发，外发授权必须另行明确绑定版本/摘要 |
| 范围 | 一梦、最多两幕加一次醒来；总共最多3次请求，无自动修复/重试/付费API回退 |
| 本地限制 | 每次60秒、请求/流各65536字节、最终JSON1200字节；不宣称400 token硬上限 |
| 用量归属 | 只走明确获准的 ChatGPT plan；先由用户在官方设置核对应用限制及积分使用，无法确认就不发生成请求 |
| 登录 | 本机系统浏览器、127.0.0.1 loopback、state/nonce/PKCE、签名/issuer/audience/expiry/nonce核对、明确检查授权scope |
| 保存 | 先持久保存稳定host ID；保存并复用issued client ID；账户与工作区注册分开；凭据保护和续期须独立实现，不让用户粘贴token到聊天 |
| 执行 | 新执行身份和独立授权，发请求前持久占用调用名额；不确定尝试不自动恢复；原梦/醒来/候选/余韵分别返回 |
| 撤回 | 沿用受管理正文屏蔽/清理要求；取消或撤回后的晚到结果不能发布；不许以新目录绕过历史 |

下一步先确认上述输出上限变化和用量边界，再实现本地登录与执行器。登录成功、请求成功和生成质量验收是三个不同结果。旧付费源码清单、合同、历史 unknown 占款、已保存梦簿与 Asteria 均未改动。

## 验证与来源

运行 node --test test/chatgpt-plan-protocol.test.js。三阶段样例是人工脚本响应，只证明请求转换与解析/摘录链路；不是 GPT 实际生成、持久闭环或质量证据。验证汇总见 validation/chatgpt-plan-protocol.json。

官方文档仅用于确认公开协议要求；代码独立实现，没有复制官方示例/SDK或第三方实现，没有新增依赖。引用网页不构成复制其代码的许可；将来若引入SDK，须另核对所选版本许可证，复制仍需确认。

- [开源应用 plan usage 概览](https://developers.openai.com/siwc/token-sharing-open-source)
- [注册、登录、签名与scope核对](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- [模型目录与流式推理](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [当前不支持的字段及工具](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- [账户、会话与应用用量管理](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)

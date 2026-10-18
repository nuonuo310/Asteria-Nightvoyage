# GPT订阅首次虚构梦试跑：已实现，真实推理待批准及核验

此切片实现 `ChatGPTPlanAdapter` 的固定官方 HTTP/SSE 传输与一次性本机入口。它复用 `ModelPortNightvoyage`，没有改写梦境核心或实现 Asteria 桥。默认开发仍为 Fake；普通 `chatgpt-plan-login.mjs login` 仍只核对身份与目录。Codex 的原生订阅执行器仍待对接，API/DeepSeek 历史入口、批准和占款不变。

用户回报已完成 Windows 身份、权限范围与型号目录核对，并确认本次会话撤销；这只支持登录/目录可用，不是推理资格、用量设置或梦境质量证明。本切片本身仅用独立合成 OAuth、HTTP/SSE 和临时 Store 验证，尚未真实推理。

## 固定候选与批准

[公开候选](proposals/gpt-plan-first-fictional-dream-v1.json)固定 `gpt-5.6-sol`、`ChatGPTPlanAdapter / openai / chatgpt_plan`、`chatgpt-plan-inline-http-v1`、一个完全虚构素材、最多一梦三次调用（两幕与一次醒来）。原素材文件始终 `modelEgress:false`；只有本机显式批准后，为此候选的快照赋予外发权限，不修改素材原文件。不是使用真实记忆或另一个身份的许可。

本机批准有效24小时；绑定公开候选中的运行设置、归一化LF的素材哈希、相对静态 import 闭包与 package.json 哈希。当前代码必须与已提交候选一致。重跑 init 不刷新期限、清除失败、重置次数、释放旧 API 占款或换目录继续尝试。可信本机源码/Node运行环境是前提；这些绑定不是对抗恶意同权限进程或篡改本机授权文件的安全沙箱。

在运行 init 之前，用户必须明确同意本次三次真实订阅调用、虚构外发及没有服务端 token 硬上限，并到 **ChatGPT 设置 → 用量** 确认该应用不使用额外积分。如果页面没有可确认的相应设置，停止并核对，不以本地参数替代真实设置。程序只记录用户声明 `usageSettingsVerification:user_assertion_only`，不声称远程核验或免费。

普通 preflight 无批准时不创建目录、不读凭据、不登录、不生成：

```sh
node scripts/chatgpt-plan-trial-cli.mjs preflight
```

只有上述确认完成后才允许执行以下 init；命令的存在不是用户已批准：

```sh
node scripts/chatgpt-plan-trial-cli.mjs init --approve-fictional-subscription-trial --confirm-extra-credits-disabled --acknowledge-no-server-token-cap
```

正式运行命令为 `node --dns-result-order=ipv4first --no-network-family-autoselection scripts/chatgpt-plan-trial-cli.mjs run --live`。Windows命令须在确认后单独交付。它打印新的本机授权链接，用户手动在官方页面登录；不得分享链接、回调或凭据。现有登录核对已撤销的会话不能拿来续用。

## 真实调用链与限制

`explicit approval → checked OAuth/identity/scope/catalog → opaque session handle → ChatGPTPlanAdapter → fixed POST /v1/responses → bounded completed SSE → canonical stage → existing atomic checkpoint`。

只有签名、scope、稳定client/subject绑定和本次目录检查通过后，才签发内存能力。能力不是JSON token容器；会话结束或过期后失效。传输在内存中取得Bearer，固定HTTPS地址、禁止重定向，不读API Key/环境凭据、不提供网络覆盖/工具、自动刷新或重试。普通登录命令不会触发这个 action。

每次 HTTP 前和流读取间检查本机批准/来源/当前 run、固定素材和配置、当前 durable attempt 与 session binding。首个外部意图前已保存 adapter/model/protocol。整梦只有一个 adapter，不启用任何 fallback，失败不换Codex/API，不产生修复调用。

请求JSON最多65536字节，SSE最多65536字节/128事件，最终内容JSON最多1200 UTF-8字节；每次本地超时最多60秒。只有权威 `response.completed`、精确型号、可接受的文本输出、完整JSON、规范用量和阶段合同均通过，才保存正文。部分文本、坏JSON、超限、工具/未知输出、HTTP/流错误、取消/撤回后的晚到正文均不发布。目录仍为单独1 MiB上限，其他认证JSON为128 KiB。

**没有服务端 `max_output_tokens` 上限。** 字节与时间限制控制本地读写和等待，不能证明远端停止、退还额度或按某个金额结算。`money:unknown`；回执只保存通过验证阶段的可用usage，其余unknown。`external_calls_started`是持久外部调用意图数，可能包含实际网络未开始的保守计数，不是独立供应商账单。

## 持久状态、重放、取消与恢复

| 状态 | 下一次 run 行为 |
| --- | --- |
| 未批准/过期/源码变化/来源撤回 | 登录及生成前拒绝 |
| approved | 只允许这次显式执行进入 authorizing |
| authorizing/executing 中进程退出 | 保留状态/unknown撤销；不重新登录或分发 |
| failed/uncertain/cancelled | 返回本地状态/检查点，不补发任何阶段 |
| completed | 本地读取保存产物，不登录、不新增调用 |
| deleted/revoked | 不返回原梦或关联正文，不从旧缓存恢复 |

首次订阅入口不开放 resume/retry；中断后读取已有检查点供复查，不能自行恢复或新建额度。这比通用端口的安全显式恢复更保守。完成/失败重放只从同一 Store 读取，且源码候选仍必须匹配；升级不自动接管旧授权。

SIGINT/SIGTERM 在本地取消当前 run，传输中止或忽略晚到内容，不开始下一幕/醒来。原梦、醒来、余韵、后来回想/续写继续分型保存，读者不将梦当作现实事实。结构及字面依据通过不是情绪语义或梦境质量验收。

Windows梦簿在 `%LOCALAPPDATA%/Nightvoyage/gpt-subscription-first-dream`，登录身份元数据仍在独立 `chatgpt-plan-connection`；源码仓外，不接管旧API梦簿/账本。可用 `scripts/dreambook.mjs read --latest --data-dir <绝对已有目录>` 显式本地查看新产物。Store启动可能执行锁/日志恢复和写入，不宣称生命周期零写入。

access/refresh/ID token只在内存中；action结束即失效能力，并单独尝试会话撤销。只有成功响应才报告true，失败false、进程死亡或不能确认时unknown并提示去ChatGPT设置断开；不据本地abort猜远端取消。账号身份绑定元数据是私有本机运行数据，不上传公开仓库。

来源撤回保证仅覆盖单机受管理Store、日志和临时文件；不会从恢复路径重新曝光正文。外部备份、已经返回的副本、终端历史、供应商留存和物理擦除不在保证内。没有原始请求/响应缓存，也不保存提供商thread/response ID充当记忆。

## 离线核验与当前真实状态

```sh
node scripts/check-chatgpt-plan-trial.mjs
```

该脚本替换所有对外 HTTP 为独立合成响应，只在127.0.0.1模拟回调，创建并清理自己的临时数据；不打开浏览器、不读用户凭据/梦簿，不登记真实用户批准或调用模型。验证三阶段、规范用量、原子保存、无登录重放与撤回重开。其adapter回执表示被测试的生产路径，外层结果明确 `dispatchKind:independent_synthetic_oauth_and_http`；不能冒充真实订阅调用。

[验证汇总](validation/chatgpt-plan-first-dream.json)列出真实执行过的测试及限制。真实订阅推理、实际输出质量和Windows新入口仍待单独批准/运行；Asteria适配和原生Codex入口待对接。

## 公开参考与许可

独立实现，无第三方实现复制或新依赖；项目MIT，未修改其他仓库。仅参考以下官方协议（2026-10-18核对）：

- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)：公开模型目录、固定Responses地址及completed完成语义。
- [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)：store/stream/input要求与不支持的token上限等字段。
- [Accounts and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)：临时凭据保护、撤销和ChatGPT用量设置。

# 零生成调用失败的显式接续

用户回报单次协议诊断在公开认证配置读取阶段连接超时，调用意图数为0，未保存正文，撤销状态null；随后公开网络检查返回200。后一次检查只证明当时可达，不能保证接下来的网络稳定。原诊断记录不包含持久的授权失败阶段，不能由元数据补造旧原因。

本切片为这一类零生成失败增加一次**显式接续**，不删除、覆盖、重置旧记录，不增加原诊断家庭的一次生成上限。先前的一次生成授权尚未发出请求，用户已在该网络失败后明确要求继续；仍需用户运行专门的本机接续确认和登录。没有后台自动执行、自动重试或API兜底。

## 固定入口与资格

[候选](proposals/gpt-plan-zero-call-reconnect-v1.json)固定 `GPT-5.6-Sol / ChatGPTPlanAdapter / openai / chatgpt_plan / chatgpt-plan-inline-http-v1`、同一份公开虚构素材和相同首幕协议。它绑定自身静态源码闭包、素材哈希和依赖的历史公开候选数据文件。没有第三方实现复制、新依赖、其他仓库修改或Asteria桥实现。

仅接受原诊断为：固定已批准候选、明确failed、0个持久生成调用意图、accountBinding为null、用量unknown、诊断和模型错误均null、撤销状态null；父梦仍须符合原固定失败摘要。authorizing/dispatched不确定状态、已有生成意图、已绑定生成动作、撤销待处理、陌生候选、过期或撤回的记录均不接管。

这些规则证明的是本机记录中的零持久生成意图与未绑定生成动作，**不证明旧登录失败一定发生在某个网络阶段**；旧discovery超时来自用户提供的回执。不会把该口述原因回填成机器诊断。

接续使用原诊断Store，在独立 `planResponseReconnect` 元数据中追加：自己的精确批准、原记录哈希、父摘要哈希、时限、唯一请求编号、阶段、调用意图、固定诊断、规范用量/unknown、白名单授权失败摘要及撤销状态。`planResponseProbe` 原对象与父梦Store内容保持不变；不新建梦簿或修改旧API账本。

接续期限不晚于原诊断期限，初始化重放不刷新时限。最多一个接续记录；原诊断加接续累计最多一次生成意图。原来那场失败的两幕梦仍保持独立，不恢复或拼接。

## 网络与持久状态

1. 精确确认后登记approved接续。
2. 每次用户显式run先做一次公开discovery请求及配置验证；没有循环。此检查失败时原批准状态保持approved，不启动OAuth、不读取用户凭据、不发生成请求。返回 `network_precheck_blocked`，用户需显式决定是否再检查。
3. 公开检查通过后，重新核对原记录、父记录、来源、源码与时限，持久保存authorizing，再进入已有OAuth身份/权限/目录核对。
4. OAuth自身仍有独立discovery核验，不能据前置200跳过；此后失败会持久记录白名单授权阶段并停止。网络仍可能在两次请求之间变化。
5. 生成前持久保存唯一调用意图，使用同一生产DreamModelPort适配器校验，保存诊断或规范用量，丢弃所有生成正文。不继续第二幕/醒来。
6. action结束清除内存能力并尝试撤销；成功才报告true。中断后的authorizing/dispatched为uncertain，不重新登录或分发。

取消（包括公开预检期间）、来源撤回、父记录改变、存储故障和第二Store owner均阻断后续生成。终态重放只返回本地元数据。初始authorizing写入未成功时不会启动OAuth，不声称未成功的写入已持久消耗；已持久authorizing或意图不能自动复用。

授权摘要只包含固定status/reason/failureStage与HTTP状态、网络错误白名单；不保存回调、凭据、原始异常或HTTP正文。新摘要随最终元数据原子保存，未知仍为unknown/null。保存失败不能伪造accepted或成功撤销。

## 本机使用

```sh
node scripts/chatgpt-plan-probe-reconnect-cli.mjs preflight
```

精确init确认标记为：`--approve-zero-call-reconnect --allow-fictional-egress --confirm-one-call-limit --confirm-no-extra-credits --acknowledge-no-server-token-cap`。实际启动是同一入口的 `run --live`，使用已验证的Node IPv4连接参数；由用户打开新打印的本机链接登录。命令存在不等于授权已经发生。

追加接续后应使用此入口查看状态。旧单次诊断CLI按原规则拒绝陌生顶层元数据，不会忽略接续记录后重新执行原批准；旧失败对象仍原样保留。

默认目录不变：`%LOCALAPPDATA%/Nightvoyage/gpt-subscription-response-diagnostic-v1`。本机记录、账号绑定和运行数据不进入源码仓。可信源码/Node/同权限环境是前提；不声称防止恶意本机进程篡改或用户手动删除管理数据。Store启动可执行锁/日志恢复写入。

请求/流/内容字节与本地60秒上限沿用生产适配器；没有服务端token硬上限，不保证远端停止或退还周额度，金额unknown。不批准额外积分、不读取API Key、不切Codex或计费API。来源撤回保证仅覆盖本机受管理数据，不包括供应商留存、外部备份或已返回副本。

## 验证与真实状态

```sh
node --test test/probe-reconnect.test.js
```

测试使用独立虚构素材、合成OAuth/HTTP与临时Store；唯一原生网络是本机回调。覆盖原记录不变、原期限不延长、累计一次上限、前置网络失败不消耗、第二次discovery失败持久摘要、重复run/init、取消、超时、来源撤回、初始/意图/结算存储失败、真实子进程退出、过期/变更/owner阻断、CLI闭合和CRLF哈希。没有用户Store、真实凭据或真实模型请求。

具体结果见验证JSON。Linux通过不代表Windows接续已执行。单幕accepted只表示新响应通过协议，不能证明旧错误根因、完整梦境成功或情绪语义/质量验收；Asteria正式桥和原生Codex仍待对接。

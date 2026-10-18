# GPT订阅单次响应诊断：实现完成，真实调用待批准

首次GPT订阅梦的用户回执为首幕校验失败，具体旧响应已丢弃。新的历史入口已能读取旧状态，不能恢复具体原因。本切片准备一个独立、最多一次调用的协议诊断，观察**新响应**通过或被哪项检查拒绝。它不恢复旧梦、不诊断已丢弃的旧响应、不生成第二幕或醒来，不保存或显示生成正文。

## 固定合同

- [公开候选](proposals/gpt-plan-single-response-diagnostic-v1.json)：`gpt-plan-single-response-diagnostic-v1`，固定 `GPT-5.6-Sol / ChatGPTPlanAdapter / openai / chatgpt_plan / chatgpt-plan-inline-http-v1`。
- 与首次梦使用相同公开虚构素材及首幕协议。素材原文件的外发权限仍关闭；单独本机批准后仅为本次快照赋予权限，不修改原文件。
- 新入口绑定旧试跑的完整、无正文历史摘要哈希，要求其为1个调用意图、0幕、用量unknown、未分类响应失败、具体诊断缺失且撤销回报true。旧记录缺失、变更、撤回或被另一Store持有时，拒绝采用。无用户run编号、私有路径或凭据写入公开候选。
- 必须另行批准一次订阅调用、虚构外发、旧失败记录保留、不使用额外积分及没有服务端token硬上限。批准绑定候选、静态源码闭包、历史候选数据文件、素材、24小时时限与本机父记录哈希；不会由旧批准自动继承。重跑init不刷新期限、重置状态或解除旧限制。
- 新入口只保存批准、来源无关的计数/阶段、父摘要哈希、账号绑定哈希、规范用量或unknown、固定诊断码与撤销状态。Store的dream/run/entry/recall等记录集合保持空，不保存请求、生成正文、SSE、异常自由文本或provider线程ID。
- 请求最多65536字节、流最多65536字节/128事件、内容JSON最多1200 UTF-8字节、单次本地超时60秒。没有服务端token硬上限，不保证远端中止、用量退还或免费；金额unknown。未通过完整校验的用量仍unknown，不拿局部流冒充结算证据。

## 运行与恢复

CLI为 `scripts/chatgpt-plan-response-probe-cli.mjs`，支持help、preflight、精确init和 `run --live`，不支持任意路径/型号、API、retry或resume参数。

未批准时preflight不创建目录，不登录或读取凭据：

```sh
node scripts/chatgpt-plan-response-probe-cli.mjs preflight
```

精确init需要五项批准标记：`--approve-one-subscription-call --allow-fictional-egress --acknowledge-prior-failed-trial --confirm-no-extra-credits --acknowledge-no-server-token-cap`。命令的存在与合成测试不构成用户批准；真实运行指令应在明确确认后单独交付。

默认本机诊断Store为 `%LOCALAPPDATA%/Nightvoyage/gpt-subscription-response-diagnostic-v1`，旧梦Store与登录身份元数据目录不变。这是另行批准的一次独立诊断，不能通过新目录、删除文件或修改状态逃逸次数限制。可信本机源码、Node运行环境及受管理Store是前提，不声称对抗恶意同权限进程。

在OAuth之前持久保存authorizing；在适配器调用前持久保存唯一外部调用意图。任一非approved状态的重放都只返回本地元数据，不登录、不请求模型。authorizing/dispatched中死亡返回uncertain，撤销未确认；不能重新授权或补发。第一次authorizing写入未成功时不会启动OAuth；保留原有批准状态，不宣称失败写入也已持久消耗。

| 结果 | 含义 |
| --- | --- |
| accepted | 新的单幕响应通过现有协议/阶段校验；正文已丢弃，不是完整梦或质量验收 |
| rejected | 新响应/传输拒绝；保留固定诊断或既有控制错误，不修复、不重试 |
| failed | 本次授权/action未完成；具体登录阶段仅返回白名单摘要 |
| cancelled | 本地取消；可能已有一个外部意图，不保证远端取消 |
| uncertain | 中断后无法确认完整结果；停止，需人工复查 |

账号使用同一官方临时OAuth能力；不读取API Key或提供付费API兜底。action结束尝试撤销并清除内存能力。只有撤销成功才回报true；false/unknown需按提示去ChatGPT设置断开，不将本地abort当远端成功取消。没有远程核验用量设置；不使用额外积分属于用户声明。

来源撤回在HTTP前及流读取之间核验，晚到正文不返回/保存；重开、重放和重新init仍拒绝。管理范围是本机受管理Store及日志，不包括外部备份、终端已输出副本、供应商留存或物理擦除。Store打开可执行锁与日志恢复，不承诺整个生命周期零写入。

## 验证与后续

```sh
node --test test/plan-response-probe.test.js
```

所有自动测试均为独立虚构素材、合成OAuth/HTTP、临时Store；唯一原生网络是本机回调，没有访问用户Store或发起真实模型请求。覆盖精确批准、无目录预检、父记录不变、一次调用/无正文、固定拒绝码、无登录重放、取消、超时、字节上限、初始/意图/结算写失败、子进程真实退出、来源撤回、父记录变更、CLI参数拒绝以及LF/CRLF哈希。Linux测试不代表已在Windows执行。

本次未变更已接受的协议规则、梦境核心或provider默认值；未新增依赖或复制第三方实现，采用项目MIT。Asteria桥与原生Codex入口仍待对接。先获得用户对这个**新的一次调用**的批准；实际结果回来后才判断新响应是否可用，不能保证重现旧错误。

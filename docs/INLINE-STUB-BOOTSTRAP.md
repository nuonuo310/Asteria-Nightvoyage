# 直接引文：干净子进程中的固定模拟入口

状态：`clean_process_fixed_stub_bootstrap_verified / paid_entry_pending`。本轮将既有持久 stub 控制许可和生产运行器接入独立子进程。模拟器输出固定、完全虚构，不是 DeepSeek 请求、梦境质量样本或新的费用授权。

## 进入顺序

`inline-stub-launcher.js` 只接受 `run|resume --data-dir <absolute existing authorized stub Store>`。不提供 init、live、Key、预算、任意模块或 transport 参数，不默认选择用户数据目录。缺目录或许可不创建 Store；公开自检负责自行构造和清理临时虚构历史。不要把自检改成真实梦簿路径。

launcher 使用当前 Node 的绝对可执行路径、固定 worker 文件和参数数组，不经过 shell，也不继承 execArgv。子进程只继承 SystemRoot/SYSTEMROOT/WINDIR、TEMP/TMP/TMPDIR、LANG/LC_ALL；NODE_OPTIONS、NODE_PATH、供应商凭据、代理、HOME 与其他应用配置不传入。Windows 只隐藏子进程窗口，不声称已在 Windows 实机验证。

worker 的受信前置只静态加载 Node 内建与既有 parse/load 辅助模块；在导入任何梦境运行器之前：

1. 限定参数与环境名，将全局 fetch 固定为拒绝函数，监测 Key 读取。
2. 重新读取递归 src/fixtures/package 清单，核对文件集合、规范化 hash、no-paid 标志和无外部依赖。符号链接、增删改、无效 UTF-8、超大文件和不符图关闭。
3. V8 仅解析静态依赖图，与 `inline-bootstrap-graph.json` 完整比对；安装同步 resolve/load 约束，再动态导入唯一 session 根。
4. 在约束持续生效期间创建受控运行器；既有持久许可、锁内历史基线、账户、协议和逐阶段检查再次执行。

当前入口图33模块、184静态边、4类内建；全源码清单74文件。原运行器演练图仍32模块/182边，两个图用途不同。受限 session 根不导入 test-support，内置 HTTP 形状响应只是固定 JS 函数，不建立网络连接。运行结果只输出无正文机制摘要，不输出梦/Key/用户路径或异常原文。父进程不转发子进程 stderr，输出与等待分别受大小和15秒截止限制；异常返回固定错误。

## 重放、恢复与停止

run 只会启动既有许可绑定的唯一请求；完成重放不发起新调用。resume 必须显式请求，且不能创建缺失运行。专用核心先要求非空已提交场景前缀、逐幕 settled 账项与 attempt 一一对应，然后才向通用引擎确认恢复 uncertain 状态。内部 retryUnknown 标志用于通过该通用状态确认，不能跳过专用账项检查：只要有未知账项就拒绝，不重试未知请求。首幕提交后实际退出的用例只生成余下第二幕和醒来两次。

控制许可撤销、到期、来源撤回、第二 Store owner 或旧历史漂移阻断后续派发。派发后实际退出的用例重开保留单条 unknown 和2203200 micro-CNY完整合成预留，不能从本入口重发。来源撤回后受管理正文清除、重开不恢复；旧四笔独立虚构 unknown 逐项保留。本轮不清算任何真实历史账项。

父进程将取消信号转给子进程；session 注册现有 cancel 控制并在退出时关闭 Store。父进程截止会强制结束子进程，可能留下待下次启动处理的锁/unknown；不把进程消失当作取消已落盘，也不保证强杀前清理已完成。信号转发本轮未作跨平台人工验收；既有生产核心取消和失败测试继续回归。

## 复查与限制

无需输入 Key，在仓库目录运行：

```sh
node scripts/check-inline-bootstrap.mjs
```

自检自行建立仓外临时虚构历史与 stub 许可，独立子进程3次模拟调用/3条 settled，合成总额2520 micro-CNY；重放追加0，旧账户逐项不变，来源撤回重开无受管理正文。无用户 Store、真实模型请求或费用。模拟输入素材仍标 fictional；输出始终 dream/nonfact。

新增18项边界测试。最终 Linux Node24.19.0 全仓680/680，相关181/181；临时 Linux CRLF副本同组181/181，不冒充 Windows实机。覆盖真实子进程退出、恢复与未知拒绝、预加载注入、缺许可不建目录、源码/图/权限标志/符号链接变更、到期/撤销/撤回、占锁、旧账户漂移。初轮恢复漏传通用引擎的显式确认已修复，随后新测试和全回归通过。证据见[汇总](validation/inline-bootstrap-validation.json)。

这是特定本地启动路径的约束，不是 OS/JS 沙箱、签名可信根或完整动态闭包证明。launcher 自身及 worker 前置代码需要受信；宿主在运行 launcher 之前已加载的任意代码无法由它撤销。本机完整写权限者可重写整套清单；既有开发 API 不因此全部变成受控入口。来源撤回不覆盖终端/导出/备份/文件历史/物理擦除或供应商留存。

旧收费 profiles 与非执行费用草案保持原样；草案 hash 已漂移，不能静默重绑或刷新批准。正式付费 profile、凭据后置 CLI、当前价格/预算及虚构外发具体批准仍待单独准备。Asteria适配仍待对接，无跨仓库修改。下一步为该正式入口整理可审查的 profile 与门禁合同，再另行确认费用；本次无需用户操作或密钥。结构测试不证明语义支持、真实模型遵守率或梦境质量。

公开内容仅项目自有 MIT 代码、独立表述和虚构样例，没有复制第三方实现或私有 Continuity 原文、聊天、梦簿、配置或 Key。

# 本地梦簿浏览器视图

状态：`local-dreambook-view-v1`，只读、仅 loopback 的用户查看切片。它把已有 Store 中经严格投影校验的原梦、醒来、后来回想、想象续写、模拟评价、独立意见和来源放到一个本地 HTML 页面中展示。显示不等于语义支持、人工验收、现实事实或梦境质量通过。

## 入口

从仓库目录运行独立虚构 demo：

```sh
node scripts/dreambook-view.mjs --demo
```

需要自动打开本机默认浏览器时：

```sh
node scripts/dreambook-view.mjs --demo --open
```

demo 在启动时用仓库固定虚构 fixture、本地合成预算和三次假阶段调用创建临时 Store，再追加一条虚构后来回想、一条虚构想象续写和一条独立虚构评审。页面加载或刷新不会生成新梦、调用模型或写评审；退出或 Ctrl+C 会关闭服务与 Store，并在关闭成功时清理临时目录。若 `Store.close()` 失败，固定回执为 `store_close_failed`，退出码为 1，demo 临时目录保留为关闭未确认的本地证据，不能据此声称 owner 已释放。

显式查看已有 Store（必须是源码目录之外的绝对路径）：

```sh
node scripts/dreambook-view.mjs --data-dir C:\path\to\existing-book --latest
node scripts/dreambook-view.mjs --data-dir C:\path\to\existing-book --dream-id visible-dream-id
```

`--latest` 指持久插入顺序中最后一条可见原梦，不是时间戳。未指定 `--data-dir` 不会退回用户默认 Store，也不会创建新 Store；不存在、不可见、协议不支持或损坏的选中梦失败关闭，不替换为更旧梦境。普通 Store 只被读取，停止时不会被删除。

可选 `--port 0-65535`，默认由操作系统分配端口。服务启动时在当前终端显示一次性 bootstrap 用户名和随机密码，用于浏览器自带的 HTTP Basic 身份提示。服务地址只包含 `127.0.0.1` 和端口，不含目录、梦境正文、评审备注或 bootstrap 秘密；秘密不进入 URL、查询串或浏览器历史。

## 页面顺序与身份

页面依次展示：

1. 已保存的原梦，按保存顺序编号。
2. 醒来片段、逐字摘录来源、模拟余韵和待验证联想。
3. 后来回想与想象续写，分别标注为独立子记录，不并入或改写原梦。
4. 模拟评价、情绪声明和字面依据。
5. 分别署名的独立评审意见，保留原始备注、编号和修订关系。
6. 来源、派生身份、协议版本、语义支持与质量验收状态。

页头明确标注虚构素材、非现实事实与固定虚构演示/本地已保存梦境。后来记录若被删除或来源撤回，Store 的既有清除规则会使其不再出现在后续读取；已经打印、截图或复制到浏览器外的副本不能被远程擦除。

## 本地访问边界

- 只绑定 `127.0.0.1`，不监听局域网或公网地址。
- 每次进程启动生成新的 256-bit bootstrap 密码。未携带匹配 `Authorization: Basic` 的首次 GET 只得到 401 解锁提示，不返回任何梦境正文，也不发放 cookie；匹配后才读取投影。密码只在启动终端显示，浏览器地址始终不含秘密。进程重启会更换秘密。
- 只接受 GET 与 HEAD。其他方法返回 405；未知路径、查询串、错误 Host、跨源 Origin/Referer、跨站 Sec-Fetch-Site 和非 loopback 远端地址均拒绝。
- 响应启用 `script-src 'none'`、`connect-src 'none'`、`frame-ancestors 'none'` 等 CSP，以及 `no-store`、`nosniff`、`no-referrer` 和权限限制。
- HTML 完全由服务端生成；所有保存文字经过 HTML 转义，控制字符显示为 `\uXXXX`。页面没有脚本、表单、远程图片、字体、样式表、遥测或外部链接。
- 服务与 Store 使用同一生命周期；关闭服务会释放 HTTP 连接，并在成功时释放 Store owner 锁和文件句柄。`Store.close()` 抛错时关闭调用以固定 `store_close_failed` 拒绝，清理证据为 `httpListenerClosed=true` / `storeReleaseConfirmed=false`，CLI 以退出码 1 报告；不得把该路径描述为 owner 已释放，也不得在未核验 `owner.lock` 前重开 Store。demo 临时目录在该失败路径上保留。

这是本地单用户边界：HTTP 客户端即使能访问 loopback，也必须先获得终端显示的一次性秘密才能首次读取正文。它不是防御同一操作系统账户中可读取终端输出、进程内存或调试通道的恶意进程的通用沙箱，也不证明浏览器扩展、操作系统、密码管理器或用户主动复制之后的保密性。Host/Origin/Referer/Sec-Fetch-Site 检查仍保留为纵深防护，但不被冒充为首次读取能力。

## 离线自检

```sh
node scripts/check-dreambook-view.mjs
```

自检只创建自己的系统临时虚构 Store，验证：三次假阶段调用、两条独立后来记录、loopback、无 bootstrap 的首次 GET 拒绝正文、正确 bootstrap 后才读取、GET/HEAD 限制、章节顺序、后来记录不混入原梦、HTML 无脚本/远程资源/绝对路径、CSP、刷新与重放、静默 Store 字节不变、关闭后 owner 可重开，以及零真实模型请求和零凭据读取。输出不含正文、绝对路径、实际用户编号或 bootstrap 秘密。

## 不做的事

本切片不登录、不读取凭据、不调用真实模型或付费 API、不运行 `init` / `run --live`、不创建新许可或预算、不执行删除/撤回/评审提交/策略变更、不接入 Asteria、不修改第一阶段冻结或正式桥。浏览器视图不是 GPT/Codex 真实订阅推理成功，也不评价梦境内容质量。

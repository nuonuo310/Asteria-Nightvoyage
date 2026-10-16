# 直接引文：锁内历史前置与 ESM 依赖约束

状态：`prerequisites_rehearsed / durable_approval_and_live_entry_pending`。本页保留该切片历史；后续[持久stub控制许可](INLINE-DURABLE-AUTHORIZATION.md)已接入本地逐阶段检查，真实付费入口仍未实现。本轮增加生产模块和独立测试，未将它们接成真实调用入口。`dispatchAuthorized:false / liveEntryAvailable:false` 始终保留；原 inline client/runtime/live allowance 硬阻断不改。

## 锁内历史检查

`InlineHistoryGuard` 只接受活跃的同进程 Store，并核对 owner.lock 的 PID、路径文件身份与已打开 fd 的 dev/ino。Store 自身启动仍可能执行恢复、清除临时文件和保存；guard 不创建 Store，不取得/恢复锁、不写账户或批准。关闭/poisoned Store、锁文件替换、已撤回来源均拒绝。

它读取四份既有批准文件，使用各自现有历史 reader 精确匹配固定旧合同，不复查旧派发 pins，也不刷新旧到期时间。每个账户核对规范 allowance、账户 fingerprint、请求键、runIds 集合、预留上限和未决类别；四笔 unknown 另绑定来源/版本、完整金额、批准 allowance、请求/运行身份或单幕诊断登记。批准JSON损坏时只返回固定诊断，不回显JSON片段。其他 settled 历史保留，不把金额总数相同当身份一致。这里不是对供应商收费真实性或所有 settled usage 的独立审计。

首次检查捕获所有旧账户、四个历史绑定和批准文件的 hash；`assertPreserved()` 再核对当前锁、源码、历史合同，并逐项比较。只允许额外出现固定候选名称、绑定 inline 协议的 **stub** 账户；该例外不批准候选账户的未来费用或运行。任意旧账户/绑定改变、删除旧 settled 账户或新增无关账户都关闭。测试并未接触用户历史，也没有重建用户丢弃的响应或推定其原请求指纹。

此 baseline 当前仅在 guard 生命周期内，重开后会从独立虚构历史重新核验并捕获，**尚非持久授权凭据**。未来正式 init 必须在用户明确批准后把当时逐项 baseline 与新 profile/allowance 固定，重启不能把已改变的历史当新 baseline；运行器每次派发及原子发布也必须显式调用门禁。当前 guard 没有被 client 当作 capability 或被运行器自动调用，不能说完整正式 admission 已接通。

## 依赖约束

新增 `inline-entry-graph.json`，以 Node 24.19.0 的 `vm.SourceTextModule.moduleRequests` 解析入口静态 import/re-export：29个生产模块、160条静态边、4种 node: 内建模块。仅解析，不 link/evaluate VM 源码；循环有去重。它不是用正则猜 import；裸第三方包、源码树外文件、query/hash 别名、data URL、非 evaluation phase、import attributes 和符号链接都拒绝。

独立新进程演练先比较实际解析图与审阅快照，再安装同步 `module.registerHooks`，之后才动态加载入口。resolve 限定图内文件 URL 与已列 node: 内建模块，load 再核对实际源码 hash 和 ESM format；图外动态 import、data module、未列 node:net 及解析后改写均被拒绝。本轮源码/样例总清单由65增加到68，旧收费 profile 不变。

这只是已审代码在新进程中 **ESM resolution/load 的约束**，不是 JavaScript/操作系统沙箱。图中 node:fs 等仍有其本来能力；不能据此宣称动态代码、任意文件访问、worker、已加载模块缓存、Node/原生模块依赖的完整闭包已证明。未来入口需采用明确 bootstrap/启动参数与环境约束，把这条约束实际装到调度进程；不能在已缓存业务模块的进程里补装后宣称全程受控。当前独立演练不等于这些启动约束已接到真实入口。

无需 Key 的固定演练：

```sh
node scripts/check-inline-history-guard.mjs
node --experimental-vm-modules scripts/check-inline-entry-dependencies.mjs
```

VM 解析 API 在此 Node 版本仍为 experimental；脚本显式要求该 flag，不静默回退。模块加载演练会正常 evaluate 已审生产模块的顶层定义/静态数据读取，不能把它写成“完全没有 evaluate”；parse-only 标签只指构图步骤。

## 证据与下一步

新24项；最终 Linux 全仓638/638；本轮前置/依赖24＋准备25＋生产37＋归属18＋inline评审17＋旧读取2＋集成16＝139/139，临时 Linux CRLF 同组139/139。旧嵌套历史套件9/13/31/23/13另列，不重复加总。首次测试发现子进程测试字符串换行错误，修正后重跑，最终记录见[验证汇总](validation/inline-admission-validation.json)。没有新增 Windows 实机、真实供应商计费、模型遵循、语义支持或梦质量成绩。

锁内演练允许新增一个合成 stub 账户，旧账户逐项不变；重开后重新检查，来源撤回后 guard 关闭，旧无正文账本仍保留。guard 单独调用前后 state 字节不变；整个演练的 Store 生命周期可能写盘。依赖演练在新进程阻断未列加载；两脚本 native fetch 和 Key读取均0。所有历史均自有虚构 fixture，不含用户运行编号、梦正文、私人配置或私有仓库原文。

公开仅项目自有 MIT 源码、独立表述和虚构样例，无第三方实现复制。下一切片实现持久批准/baseline、profile、bootstrap 和逐阶段预算/权限门禁，并在默认关闭下验证完整入口；再就[具体费用草案](proposals/inline-single-dream.json)请求另行确认。现在不给用户输 Key 的指令，不靠工程测试批准真实调用。

## 公开参考

- [Node 24.19.0 VM](https://nodejs.org/download/release/v24.19.0/docs/api/vm.html)：解析 API 与 experimental 限制；仅借鉴 API 用法，无实现复制。
- [Node 24.19.0 module hooks](https://nodejs.org/download/release/v24.19.0/docs/api/module.html)：同步 resolve/load，须在业务模块加载前安装。
- [DeepSeek 中文价格表](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/) 与 [模型列表文档](https://api-docs.deepseek.com/api/list-models/)：2026-10-16 阅读。价格草案采用页面的 Flash 高峰 cache-miss 输入/输出上界；未实际请求 /models 或供应商 API。

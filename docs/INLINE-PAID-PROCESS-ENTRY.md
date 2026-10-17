# 直接引文：专用进程入口与凭据管道

后续[Windows子环境修复](INLINE-WINDOWS-ENVIRONMENT.md)使用独立新候选，保留本页候选与验证身份；本页798/299等数字属于此前切片，不能作为Windows实机通过记录。


状态：`dedicated_entry_implemented / independent_rehearsal_verified / live_trial_not_run`。此前剩余的专用运行器、准入后的凭据管道和付费 session 加载入口已接通。本轮只用独立虚构历史、固定模拟器和进程内 HTTPS stand-in 验证机制，没有访问用户梦簿、读取真实 Key、登记真实批准或调用模型。代码完成不代表真实模型遵守率、语义支持或梦境质量通过。

## 固定合同与许可

新候选为 `docs/proposals/inline-paid-entry-ready-20261017.json`，编号 `inline-evidence-paid-entry-ready-plan-20261017`。三份旧草案、旧收费 profile 和旧验证记录原样保留。源码变化只允许显式准备新候选；普通检查、init 和重开不会改写草案、刷新价格期限或把旧确认迁移到新 hash。

范围仍是固定 sparse-context 虚构材料、deepseek-flash、最多1梦／两幕加一次醒来／3调用，新增上限3 CNY，每次400输出 token，请求65536字节、模型 JSON 正文1200字节。原2026-10-17T14:49:00Z复核和2026-10-18T14:49:00Z到期不变；本轮没有重新查价或续期。2/8 CNY每百万的原保守快照用于每次完整2203200 micro-CNY预留，预留不表示实际消费。deepseek-flash仍是可变别名。

确认字段新增 `accountCurrency:CNY`；这只是用户声明，不是带 Key 查询或供应商账单核验。`actualAccountCurrencyVerified`仍false，不自动换算币种。公开候选的 `implementationReady/liveEntryAvailable`表示代码已提供；`paidEvaluationApproved/fictionalEgressApproved`仍false。必须精确确认当前 hash、3元、指定样例、虚构外发、保留旧hold、可变别名和CNY账户后，才能在用户已有仓外Store原子保存新的 live/provider 记录和账户。笼统“继续”和测试确认不是这份批准。

授权 terms 绑定完整确认对象、当前合同/源码/三个图、原历史基线、mode、不可变 `dispatchKind`、allowance与固定请求。`provider`和`rehearsal`不能互换，stub不能变成live；重复init不刷新、撤销不可复活、旧格式意向不静默迁移。四个旧unknown逐项保留8812800 micro-CNY；这是保守占款，不是已确认供应商收费，本入口不清算、释放或重试旧调用。

## 启动顺序与网络路径

父启动器只加载可信前置代码，不继承 execArgv；以当前Node可执行文件、无shell、绝对源码位置启动子进程。子环境只保留有限系统/临时目录/语言变量，Key、NODE_OPTIONS、NODE_PATH、代理和任意应用配置均不继承。父进程已经执行的宿主预加载无法倒退消除，宿主、启动器与加载前置必须可信。

子进程先核对完整85文件清单、独立付费静态图和源码，安装resolve/load同步检查后才加载付费session/core。新图37模块／221静态边／5类Node内建，包含node:https；原运行器图33／184／4和stub入口图34／186／4保留各自用途。清单自文件排除，static graph不冒充完整动态闭包、签名信任根或OS/JavaScript沙箱。旧stub review标志仍false，因为它不授予付费权限；专用合同和逐阶段owner门禁另外核对。

子进程随后检查既有仓外路径、owner锁、完整持久历史基线、当前合同/许可/来源/账户、运行归属和下一次实际请求字节及预算。缺记录不建目录，preflight不创建运行或账户；init才原子保存许可+账户。Store启动可能进行既有恢复写盘，不能把整个生命周期称为零写入。

只有通过这些检查，子进程才发出一次固定准入帧。父进程这时才调用 credentialSupplier；CLI此时才读取父环境中的 `NIGHTVOYAGE_DEEPSEEK_KEY`，通过单次私有stdin管道发送。Key不进入命令参数、子进程环境、文件或日志；管道帧最多8192字节，Key为1–2000个可打印无空格ASCII字符，超时/中断/格式错误固定拒绝。临时Buffer清零是尽力清理，不承诺V8字符串或物理内存擦除。收Key后重新检查准入，任一漂移即拒绝。

`InlinePaidRuntime`是唯一已接线的inline live运行器，不能接受Key、模式、fetch或URL替换参数。通用client/runtime默认仍拒绝inline live；可信类扩展hook不是对抗任意进程内恶意JavaScript的边界。六处逐阶段检查再次核对合同、许可、历史、来源、精确payload、运行/账户/协议和请求fingerprint，row必须处于相应reserved/dispatched/settled状态。

provider分支使用固定 `https://api.deepseek.com/chat/completions` 的Node HTTPS POST，不跟随重定向、不使用代理配置或全局fetch、不做连接池重试。HTTP响应包络最多65536字节，非200正文不读取，错误文本不回显；超时中止请求并保留不确定费用。模型正文继续受400 token／1200字节和协议校验约束。响应及内部JSON解码后的字符串若包含原Key则拒绝保存；这项精确回显检查不声称能识别任意编码或变形后的秘密。

## 运行、重放、取消与保存

| 动作 | 行为 |
| --- | --- |
| `proposal` | 核对当前固定草案；不选用户路径，不读Key |
| `preflight [--data-dir <绝对路径>]` | 有许可才检查下一次实际请求；无许可/到期/撤回/未决/历史变化均不能放行；不创建新运行 |
| `init` | 严格确认字段；在既有Store内原子保存独立许可+账户；不调用模型 |
| `run --live` | 固定request/session与虚构样例；完成结果重放不读Key、不新调用 |
| `resume --live` | 只显式恢复非空、逐幕已提交且settled对应的前缀；不补发未知或首幕失败 |
| `read` | 读取已保存梦/醒来/余韵/联想与独立评价视图；不重新批准生成或调用模型 |
| `revoke` | active→revoked；不延长期限或释放历史预留 |

除proposal与无目录preflight外均需显式绝对仓外 `--data-dir`，本入口不猜用户目录。run/resume必须显式--live；无Key、URL、transport、任意模型/主题选项。init的闭合参数为--confirm-contract、--approve-budget-cny 3、--approve-case sparse-context、--account-currency CNY、--allow-fictional-egress、--acknowledge-preserved-holds、--acknowledge-mutable-model-alias和--data-dir。没有自动批准脚本；当前先做下面的无Key自检，具体收费执行块在确认后另给。

阶段正文、usage和checkpoint沿用同次原子保存；重复运行最多读取已保存结果。reserved/dispatched死亡保留完整unknown hold；已提交首幕死亡可显式恢复剩余两次。取消/撤销/超时/来源撤回阻断后续派发与迟到正文；等待密钥时正常取消会主动关闭输入管道。父进程等待上限210秒，超时强制终止可能留下需重开恢复的锁和unknown，不能当作已持久取消。Windows强制终止不保证交付Unix信号处理；重开后仍不得自动补发。

完成的provider结果可以无Key重放，包括许可到期/撤销后的既有结果；仍要求当前源码/授权身份有效。源码漂移时可用普通read读取既有内容，不能以读取为名重跑。来源撤回/删除继续屏蔽所有正文/衍生视图，重开不从授权、索引或缓存复原。只保证受管理Store、日志和临时文件的逻辑清除，不涵盖终端、导出/备份、文件历史、物理擦除或供应商留存。

原梦、醒来记录、回想、续写和独立评审继续分开；梦中情绪、醒后余韵、日常召回可访问程度分别管理。素材fictional与输出dream/nonfact独立标记；输出是候选，不写Asteria记忆、人格或任务。Asteria适配器仍待对接，不宣称已有兼容。

## 无Key自检与验证边界

```sh
node scripts/check-inline-paid-entry.mjs
node src/inline-paid-entry.js preflight
```

自检只构造并清理独立虚构历史，固定rehearsal-only许可，通过真实新进程、加载图、门禁、一次dummy凭据管道及内置模拟器完成3阶段，再重开读取/零调用重放/撤回。子进程rehearse动作独立固定fixture时钟2026-10-17T15:00:00Z；该动作不在公开CLI提供，https.request硬拒绝，且不能使用provider许可。provider的init/run/resume/preflight从不使用fixture时钟。测试时钟不是候选续期。

provider分支另用测试进程内monkeypatch的HTTPS stand-in验证，不是可配置生产transport，也没有真实TCP/TLS/供应商请求。自检自身不触碰用户梦簿或真实Key，也不登记真实批准。固定模拟输出不是质量样本。

新增63项覆盖私有帧边界、准入后取Key、模拟/真实许可隔离、加载漂移、环境清理、取消等待、实际进程死亡、固定HTTPS调用与无Key重放、旧账逐项不变、HTTP/正文/Key回显/超时/撤回/撤销/存储失败。最终结果见[验证汇总](validation/inline-paid-process-validation.json)。Linux CRLF临时副本不是Windows实机，真实供应商网络和模型输出仍待单独试跑。

公开内容仅项目自有MIT代码、独立表述和虚构测试材料；未复制第三方实现、私有Continuity原文、私人聊天/梦簿/配置或密钥，未修改Asteria或其他仓库。

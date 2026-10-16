# 直接引文入口准备：源码清单与只读历史预检

状态：`readiness_observation_only / paid_entry_pending`。新增可运行的无凭据预检，不是正式收费 profile、授权 admission 或生成 CLI。任何结果均 `ready:false`；没有 init/run/live/Key/预算参数，不创建目录、账户、批准文件，不恢复旧运行，不释放 unknown。

## 本轮实现

`src/inline-entry-review.json` 是本次 Git 审阅的源码/样例快照：递归覆盖全部 src、fixtures 文件和 package.json，共65文件，排除清单自身。UTF-8 文件按 LF 规范化后 SHA-256；增删改、嵌套新文件、符号链接或非法编码都会阻断。该范围包含现有生产协议、预算、取消/恢复、读取/评审及旧 profile；旧 profile 本身不改写。清单不自签、不代表任何费用或数据权限。

这比旧“只列顶层 JS”更完整，但仍不宣称静态/动态 import、动态文件路径、Node 内建模块、运行时环境和所有潜在依赖的闭包已经证明；输出明确 `recursiveImportClosureProved:false`。目前 package 无运行依赖；若声明运行依赖，准备检查也会阻断。正式入口之前仍需明确依赖允许范围和运行期约束，不能把这份文件列表当作该工作的替代品。

预检使用固定 sparse-context 独立虚构样例，原件 modelEgress=false；输入素材与输出梦境非事实身份分别报告。它调用实际 inline request builder，只计算第一幕实际 body 的 UTF-8 字节数：本次3337 / 65536 bytes，未把字节当 token 或价格。后续幕/醒来必须在未来运行器内按已保存 checkpoint 再构建和检查；本轮没有预言后续请求大小。

| 检查 | 行为 |
| --- | --- |
| 不给数据目录 | 只检查源码与首请求；reason=history_directory_required，不猜用户目录 |
| 显式仓外目录 | 只读取 state/withdrawals/deletions；不实例化 Store，不取得 owner lock、不写状态 |
| 缺少日志文件 | 遵守现有 Store 合同，缺 withdrawals/deletions 视为空；缺 state 不接受，不补写文件 |
| 锁与恢复残留 | owner.lock、recovery.lock、snapshot.tmp 存在则阻断；不判定过期 owner，不删锁或临时文件 |
| 来源撤回/删除 | 样例来源已撤回则阻断；非空删除日志待正式 Store 恢复审查，本工具不执行清除 |
| 历史 unknown | 固定四个公开账户类别各一笔 unknown、相应 source/version、400 cap、完整预留/占用各2203200 micro-CNY；合计8812800；不接受少笔、结算替代、改金额、异类未决或中间态 |
| 观察结果 | 仅读取形状观察，不是历史真实性证明、完整费用审计或事务快照；不返回运行编号、指纹、梦正文或任意异常文本 |

读取前后复查状态/日志内容与锁残留；期间有变化会关闭。没有锁的读取无法排除所有并发/ABA/路径替换竞态，正式 admission 必须在运行器 owner 锁内重新核验完整账户、run/attempt/协议/批准身份，并逐项保存旧账本不变证据。本工具的正向形状观察不能直接交给模型 client 作为权限令牌。真实供应商账单仍未知，8812800 表示保守 hold，不是已确认支出。

## 安全命令与明确未完成项

只检查当前源码，无需 Key 或电脑上的运行数据：

```sh
node src/inline-entry-preflight.js preflight
```

固定虚构历史演练也无需 Key：

```sh
node scripts/check-inline-entry-preflight.mjs
```

演练自行创建和清理仓外独立合成 Store；从自有旧合同构造四笔账项，再禁止五类同步修改 API，执行只读准备，核对所有现有文件字节不变。源码和历史均吻合时仍报告 `paid_profile_and_explicit_approval_pending`、ready=false。CLI 正常打印阻断原因可 exit 0；该退出码不表示允许生成。

新增25项；最终 Linux 全仓614/614；准备25＋生产37＋执行归属18＋旧历史读取2＋集成审查16＋inline评审17＝115/115，临时 Linux CRLF 同组115/115。包含金额/类别/请求身份/来源篡改、缺账户、异类未决、锁/临时文件、撤回/删除、损坏/超大文件、路径隔离、清单变化、换行一致性及拒绝付费参数。旧五套嵌套历史测试9/13/31/23/13另列，不重复加总。详见[验证记录](validation/inline-entry-validation.json)。

固定脚本 native fetch/Key读取/被拦修改调用均0；只用独立虚构材料，没有访问用户 Store、供应商请求、价格核验、第三方实现复制或新增 Windows 实机成绩。合成历史旧价格字段仅用于构造过去的账本机制，不是本次价格建议。模型遵循、语义支持和梦质量仍未验收。

下一步准备完整的独立 profile 与 owner 锁内 admission、精确依赖约束、历史逐项保留、Key后置、下一实际请求检查及 Windows 入口。预算与 pricing 现在都为 null，未选择新的3元或沿用旧授权；届时核对官方模型/价格和有效期，给出具体费用/虚构外发提案，再请用户确认。当前生产 inline live 仍由既有 client/runtime/allowance 三层硬阻断。

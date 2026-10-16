# 直接引文：持久控制许可与逐阶段本地模拟

状态：`durable_stub_authorization_and_stage_checks_verified / paid_entry_pending`。本轮把许可、不可自动重建的历史基线和逐阶段检查接到真实的生产核心调用路径，但只接受明确提供的本地 stub transport。不是糯糯的新付费批准，不接真实材料、Key 或供应商；inline live 的三层硬阻断不改。

## 持久合同

`initInlineStubAuthorization` 接受已持锁 Store、显式 approveStub/旧 hold 确认和严格合成 allowance。新控制记录 `inlineEntryAuthorization` 与固定候选账户在同一次 Store.save 原子保存：要么都有，要么都没有。allowance 固定 stub、inline 协议、1运行/3调用/400输出、3000000 micro-CNY 合成上限、独立 synthetic reference/checkedAt；不能把官方价格 profile 或 live mode 塞进这个入口。数值只为原账本算法演练，不是实际消费。

不可变 terms 包括：规范 allowance、旧账户/历史绑定/批准的 hash 基线、创建/到期时间、源码清单和静态图 hash、虚构输入 hash、协议/醒来身份、固定 request/session 与运行配置。termsHash 绑定整组条件。许可最长1小时，fixture默认60秒；重复 init 只能重放原记录，不延长时间、不清空次数或重新采集基线。已有无绑定候选账户也不能收编。active→revoked 单向保存，撤销后不可通过 init 复活。

重开时把持久 baseline 传入锁内历史 guard，先比较，不能拿已改变的旧账本作新 baseline。记录只含控制元数据和 hash，不复制来源正文、梦或回想。它防止合同内的误重放、自动重置和状态漂移；不是签名凭据，也不抵御拥有本机完整写权限者整套重写文件。

## 运行与原子发布

`InlineAuthorizedStubRuntime` 在打开 Store 前要求既有控制记录；缺批准不建目录。取得 owner 后，在创建 ledger/client 或批准账户之前再次验证许可、持久基线、已存在账户及源码。默认 disabled；必须显式本地函数；没有 mode/live/Key 参数，没有环境凭据读取。constructor 失败释放 Store，不能留第二 owner 卡住后续读取。

运行只接受固定 fixture 的规范副本、固定 request/session 与两幕/一次醒来配置。只有 stub 副本 modelEgress=true，公开 fixture 原件仍 false；不能传入私人快照或任意场景数。运行首次保存 authorizationVersion/Hash，provider identity 也绑定该 hash，通用 fake/budgeted 运行器不能接手这条运行。其他现有开发 stub API 不因本切片变成收费接口；本合同约束新增受控运行器和 client，不宣称整个 JS 进程成为安全沙箱。

共享核心提供默认空的扩展钩子；该受控 client 在六处调用持久校验：

| 阶段 | 校验时机 |
| --- | --- |
| before_reservation | 凭据形状检查与账本预留之前，核对 active/有效期、基线、固定运行/请求/配置和完整 payload |
| before_dispatch | 预留已持久保存之后、标记 dispatched 之前；不能用预留期间撤销的许可继续 |
| before_http | 实际调用显式本地 transport 之前再核验；仍无 native fetch 分支 |
| response | 响应返回后、规范化前；失效、撤回或撤销时拒绝迟到正文 |
| before_settlement | usage 结算之前再次核验 |
| publish | 同一次原子结算回调内、加入 checkpoint/原梦之前再次核验 |

payload 在受控 client 入口复制，阶段/编号/来源快照/已保存幕必须与 managed run 一致；实际 request builder 校验完整链与请求字节边界。账本全局预算、阶段调用/保守 token 上限、未知尝试及原子 checkpoint/usage 规则沿用原实现。旧账本或授权结构在途中损坏时关闭 Store，避免错误收尾把被改动的旧记录写盘；此前 durable dispatched/预留在重开后保留 unknown 完整 hold，不自动补发。

## 恢复与读取

实际子进程测试覆盖授权提交前/后，以及 reserved、dispatched、首幕 committed 后退出。授权提交失败没有半记录；原子提交后即使调用者没收到成功也重放原记录。未知尝试不续跑；只在许可仍有效且已提交幕前缀与账项一一对应时显式 resume，首幕不会重新生成。完成重放不追加调用。

排队取消不消费；途中取消、超时、直接撤销控制许可或直接 Store 来源撤回均阻断后幕/醒来和迟到正文。未知费用保留全额，不以无正文替代清算。许可撤销只管新的生成，不会删掉本来合法保存的梦；来源撤回才按既有 Store 规则立即屏蔽并清除原梦、醒来、后代和缓存正文。撤回后重开不会从许可 hash 恢复正文。期限或许可阻断生成时，普通历史读取/内容适配器仍是独立通道；不强迫每次读梦都重新批准生成。

## 可复查演练

无需 Key：

```sh
node scripts/check-inline-authorized-loop.mjs
node --experimental-vm-modules scripts/check-inline-entry-dependencies.mjs
```

固定演练自行生成仓外独立虚构历史，批准合成许可，运行3次本地 HTTP 形状响应，得到3条 settled、2520 micro-CNY 合成 usage；重放追加0调用，旧账户逐项不变。读取/召回保留 dream/nonfact 身份；来源撤回后重开，managed 文件无场景或种子正文。native fetch/Key读取均0，不访问用户 Store。Store 启动/撤回可能恢复写盘，未声称整个过程零文件写入。

新24项，最终 Linux 全仓662/662；本轮24＋上一阶段相关139＝163/163，临时 Linux CRLF 同组163/163。五套旧入口嵌套9/13/31/23/13另列，不重复加总。初次演练发现输入 pricing 字段顺序问题，已改为严格闭合 schema 后规范化，未放松金额/模型/权限条件。持久身份、取消、撤销、到期、原子失败、真实进程退出、旧记录漂移与写盘关闭均有证据。见[验证汇总](validation/inline-authorization-validation.json)。

当前清单70文件；受限加载演练根改为新运行器，静态图32模块/182边/4类内建。这仍只是新进程加载演练，没有把 bootstrap/环境隔离接成真实生成 CLI，不是完整动态依赖或 OS 沙箱证明。原 generic stub 机制的默认钩子为空，旧源码测试与当前生产回归分别保留。

没有真实供应商请求、当前用户数据/Key、付费授权、Windows 实机或梦质量/语义验收。合成60秒许可不得转换为 live。前轮[费用草案](proposals/inline-single-dream.json)保留原源码 hash，现已随代码变化失配，不在本轮静默重绑；正式 profile/加载器/凭据后置 CLI 和具体费用提案仍须单独完成、再确认。

公开仅自有 MIT 实现、独立文档与虚构 fixture，无第三方实现复制或私有原文。持久保证限受管理 Store/日志/临时文件，不覆盖终端副本、导出/备份、文件历史/物理擦除或供应商留存。

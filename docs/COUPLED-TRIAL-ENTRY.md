# Coupled 有限试跑入口：待另行批准

本阶段交付可执行入口与模拟证据，**没有进行真实调用或在用户 Store 初始化新额度**。昨晚用户报告 Windows `check-coupled-budget.mjs` completed：三次stub结算、零重复、typed view、dream/非事实召回、撤回重开后正文不可读；只记为用户侧单脚本验证，不是 Windows 全套测试或质量验收。原始聚合独立见 `validation/user-local-coupled-budget.json`。

## 这次准备批准什么

| 项目 | 固定合同 |
| --- | --- |
| 提供商/模型 | DeepSeek 官方 endpoint；deepseek-flash，非思考、JSON、不流式、无工具 |
| 新批次 | coupled-affect-dream-trial-20261016，协议 coupled-affect-quotes-v1 |
| 输入 | 仅现有公开完全虚构 sparse-context：未指定身份的人、绿色钥匙、玻璃上的风筝；其他通道保持缺失/拒绝/过期状态 |
| 外发 | 单独批准后才把该固定 fixture 的临时输入副本设 modelEgress=true；源码 fixture 仍 false |
| 新上限 | 3 CNY / 1新梦 / 最多3次调用（两幕＋一次醒来）；每次输出400 tokens、1200 UTF-8 JSON bytes，单请求65536 bytes |
| 新价格快照 | 2026-10-16T14:20Z 复核；失效2026-10-17T14:20Z（北京时间10月17日22:20），不续旧批准 |
| 旧占用 | 必须确认并保留三笔 unknown，全额6609600 microCNY = 6.6096 CNY；未知实际收费不假装已知，不清算/退款/重试 |
| 新最大保留额 | 2.2032 CNY/次的保守全上下文 reservation；这是账本预留，不是调用报价或实际账单 |
| 正文保存 | 新梦/声明/依据/审计/醒来记录保存同一仓外本地 Store；新协议候选仍非现实事实 |
| 失败 | 固定request identity；unknown阻断，失败/取消不重新开始；不自动补发/修复/新建另一个额度 |

公开参考：[DeepSeek 官方价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)，本轮通过浏览器读取当日页面并另用公开HTML fetch复核。Flash峰时缓存未命中输入2 CNY/百万、输出8 CNY/百万；使用上限费率，不根据峰谷调低预留。官方列1M context，本地保守保留1100000 tokens完整上下文上界＋400输出；不按字节估算tokens。实际成功用规范usage结算，unknown保留全额；缓存/赠送余额/供应商对账不在此账本证明范围。没有启用供应商Search/Fetch API。网页价格可变，新授权必须在固定快照有效期内，若过期需新的明确评审与批次，不能悄悄改这份合同。

## 实际入口与默认状态

`src/coupled-trial-cli.js` 支持 help / proposal / preflight / init / run / read，仅 `run --live` 有进入真实传输的可能。安装、help、proposal、缺批准的preflight都不会读Key或生成账户。安装并不是许可。公共 `coupled-trial-profile.json` 中带 approved 的对象是**固定匹配模板**，只有 exact init 参数才把其副本写入仓外目录并创建新账户；proposal会删去allowance并将两项批准标志设false。

默认仍用 `%LOCALAPPDATA%\Nightvoyage\first-fictional-trial`，在同一个受管理Store维持来源撤回与历史账本。没有另造一个不共享撤回状态的正文缓存。可显式指定同一仓外数据目录；路径安全、checkout隔离、symlink、owner锁由现有Store承担，不把本地模板或运行文件当作抗恶意篡改签名系统。

安全查看（无需Key；缺批准时ready=false/coupled_approval_required）：

```powershell
Set-Location "$env:USERPROFILE\Desktop\Asteria-Nightvoyage"
node src/coupled-trial-cli.js preflight
```

本阶段没有提供让用户直接开始收费的执行块。收到对此表的费用、虚构外发、旧占用保留确认后，再给完整可复制init/预检/安全Key输入/run/清理命令。没有provider/model/endpoint/usage/输出长度override、reset或隐含retry入口；错误输出只用固定码，不复制异常原文/密钥/provider错误正文。

## Key 之前与恢复规则

同一个owner lock下复核固定配置、25个传递依赖源码pin（含入口和配置逻辑，CRLF仅规范为LF）、fixture摘要、旧三笔占用实际账项与运行身份、新account绑定/额度、到期/撤回、run协议/policy/encoding，然后用真实builder重验已有checkpoint链并构建**下一次请求**检查65536-byte ceiling。通过后才访问 `NIGHTVOYAGE_DEEPSEEK_KEY`，再按固定run/request/session identity执行。预算客户端每个stage仍重复自己的权限/字节/金额/次数/取消检查。后续stage超限不截断，停止在已保存阶段，不补调用。

queued启动可重入同一request；进程在已提交一幕后退出，只在明确 `--resume` 且没有unknown/失败终态时继续余下两次。reserved/dispatched进程死亡重开为unknown，不会因为resume再发。失败、取消、撤回、删除不新开run；部分已结算但无法完整恢复的边界宁可阻断，不用额外模型调用填补。醒来新事件仍拒绝，无第四次修复调用。completed的run/read是无Key重放，不受当前源码pin或价格到期影响；撤回/删除照样清除正文。

旧pruned入口的“其他unknown”检查从历史读取抛错移到init拒绝/dispatch预检reason。新账户若失败形成第四笔unknown，旧元数据仍可查看；旧入口不会获得新执行许可。新入口同样让后来的无关unknown只阻断执行，而不阻断历史查看。旧三笔自身的精确身份/金额/诊断仍须通过历史合同验证。没有改旧九个pin、旧报价、到期、账户或已保存输出。

限制：旧compact/quality/diagnostic历史读取器仍依赖完整的已发布公共fixture和旧协议模块。任意手改/损坏这些文件会fail closed（新入口给coupled_fixture_changed等固定码），不是任意安装版本迁移；不要据此声称篡改fixture后也可读。源码无行为注释漂移和价格过期的只读兼容已测试。来源撤回属于受管理journal流程，不能靠修改fixture来代替撤回。

## 测试与证据范围

最终Linux LF全套外层 **300/300**；新增入口定向 **23/23**；临时Linux CRLF入口23＋历史读取7＋历史入口包装1＋预算核心22＝**53/53**。历史包装中独立子进程另有 **13/13**，不混进外层计数。均0失败/跳过，没有原生Windows入口测试。

新增23项入口测试用独立虚构历史：既有9条模拟质量结算、两笔旧合成失败，再由真实ledger创建第三笔合成unknown元数据；没有复制/重建用户被丢弃的响应或本地配置。CLI测试子进程用绝对file URL preload、dummy credential和**进程内fetch stub**走mode=live路径；外部HTTP实际为零，这不等于真实DeepSeek运行。访问Key属性与stub调用次数单独标记，阻断/重放均检验未访问Key、没有新请求。

覆盖：缺批准不建目录、精确case/金额/外发/hold确认、三笔旧账户及配置字节不变、配置/账本/fixture/源码篡改、有效期、版本、读与重放、两幕声明、三次结算、无依据拒绝与第四unknown保留、醒来拒绝、真实子进程在初始保存/dispatch/scene commit退出、显式恢复/不重发、取消、撤回与重新打开、并发Store owner、纯超大虚构请求的无密钥大小检查、存储admission失败、checkpoint在Key前拒绝。`requestBytes`是序列化UTF-8 bytes，不是token或费用计量。脚本不修改源码fixture，正文/测试账本均在临时目录清理。

首轮测试preload错误使用data URL的相对import，Node无法解析；改为绝对file URL。随后一个fixture篡改测试误假定旧历史读取器不依赖当前fixture，实际fail closed；保留该边界，新增明确固定错误码并将测试/说明收敛到真实支持范围。没有放松生成、依据、usage或预算校验。最终原始日志与摘要在 `validation/coupled-entry-*`，历史13项仍在固定源码副本独立子进程运行，外层计数另列。Linux CRLF不是原生Windows。

所有新增代码是本项目MIT独立实现或复用项目自有模块，没有复制第三方实现/私有Continuity原文，无新依赖、Asteria/其他仓库修改。存储边界仍是单Store、withdrawal/deletion journal与受管理正文/后代/recall；终端交付、外部备份、供应商保存、物理擦除不由本地删除保证。语义支持、真实模型遵循、400-token适配、真实费用和梦境质量仍未评估。Asteria适配器待对接。

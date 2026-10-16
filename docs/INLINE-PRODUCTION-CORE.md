# 直接引文：正式协议与预算核心，真实入口关闭

状态：**production_core_stub_verified / live_entry_pending**。本轮实现生产源码，不再依赖test-support的格式转换或运行器；使用本地HTTP形状simulator验证正式账本与阶段原子结算。没有真实模型请求、Key读取、用户Store访问、收费profile或新额度。

## 实现合同

`src/inline-evidence-protocol.js`定义`inline-evidence-quotes-v1`，对应受限client selector `inline-evidence-v1`。它与旧compact、coupled、分幕候选及两个离线inline身份分别绑定，不能重标旧记录。运行保存协议、执行family/provider、提示hash、直接引文编码、显式情绪分支和逐字醒来策略。

| 通道 | 第一版生产核心约定 |
| --- | --- |
| 输入 | 同一snapshot合同；素材fictional，来源/版本/权限不丢失。stub测试在副本上设modelEgress=true以核验原传输守卫，公开fixture原件仍no-egress |
| 场景wire | 恰好event/appraisal/basis/affect；basis.goal为null或目标/结果两个直接引文，control/uncertainty为null或引文；不让模型填数字引用表 |
| 情绪 | 显式unchanged或estimated＋原delta＋excerpt；estimated零变化也须依据，不补数值、不推断分支 |
| 规范化 | 引文最长64 Unicode码点、必须逐字连续出现在本幕；缺目标/依据、unknown占位不符、非法结构仍拒绝 |
| 后幕与醒来 | 只在第二幕追加既有连续性候选提示；醒来必须摘录某一已保存幕，不自动编写后续或强求启示/正向结束 |
| 保存 | 完整checkpoint重新校验before/delta/after、依据、审计计数和协议身份；正文/committed阶段/usage/settled账项同次原子保存 |
| 输出 | 原梦、醒来、模拟余韵、召回候选、待验证联想、receipt分别保留来源及非事实身份 |

程序只为新wire已经提供的引文分配内部去重索引，不修复旧模型索引。`inlineEvidenceAudit`独立记录提供引文的字段数与程序intern后的唯一数；底层normalizationAudit反映该程序表，不声称模型发送过一张紧凑表。共享文字保留在原字段中，其复制仍可能超出1200 bytes；字面绑定不等于语义/情绪方向或幅度已证实。

## 账本与控制

新allowance必须显式绑定新protocolVersion；当前仅接受stub模式。没有把`inlineStubBilling`及其合成usage迁入正式账本，正式账户位于原`billing`根，复用已有整数完整context预留、结算、启动恢复与撤回日志。

实际送给simulator的body和snapshot形成指纹；全局金额/调用/运行上限、单运行调用及累计保守输入/输出上限分别守住。两幕＋醒来最多3调用，每次400输出token上限，响应JSON正文最多1200 UTF-8 bytes，请求65536 bytes，完整HTTP响应流65536 bytes并受读取/调用超时约束。字节上限不充当token或费用估算。

完成重放不发送新请求；只有无多余/未知账项、与committed幕前缀一一对应的明确恢复才可继续。实际进程在预留或派发退出，重开保留unknown完整预留；不会补发、修复或清算。场景结构拒绝保留固定词表诊断，不保存供应商任意错误正文。醒来拒绝也不触发第四次调用。

取消、超时与直接Store撤回在发布前重新核验；迟到响应不进入梦。写盘失败关闭Store，结算与正文不会在重开时分裂。四笔既有unknown测试由独立虚构历史生成，合计8812800 micro-CNY；新stub账户运行、撤回和重开后，旧账户逐项保持不变。没有打开用户真实历史。

## 真实调用仍被硬阻断

- inline live client和runtime在创建Store/账户或读取凭据前报`inline_live_entry_pending`；新协议的live allowance也被拒绝。
- send再次检查inline只能stub，运行中篡改client mode也不能切到native fetch；默认disabled仍不派发，stub必须提供显式本地传输和dummy credential。
- 不新增收费CLI、reviewed profile、价格批准、Key环境加载或真实素材权限。不因本轮测试通过沿用已停止批次的预算。

未来真实入口需单独准备reviewed依赖闭包、四旧hold/历史逐项检查、独立allowance、凭据后置读取和明确费用/虚构外发确认。当前旧50pin保持漂移而profile未改；新生产模块未被旧profile覆盖，不能据此认为旧批准覆盖了新代码。

## 读取边界与测试

普通梦正文、receipt和cue recall可通过原通用合同读取；撤回/删除继续优先。**现有生产appraisal read/review adapter对新协议仍返回unsupported_protocol**，本轮不将未支持的视图标成available。下一切片才显式增加该协议的只读/独立评审合同。Asteria adapter仍pending，候选不能直接改真实记忆、人格或任务状态，也没有现实工具执行。

无需Key的固定命令：

```sh
node scripts/check-inline-production.mjs
```

只创建/清理仓库外临时Store；3次本地HTTP模拟、3条结算、3指纹匹配，重放0追加，撤回重开无正文/召回。guard下native fetch和Key读取均0。fixture的2203200 micro-CNY完整预留及2520合成结算仅为旧算法参数和脚本usage，不是本轮官方价格复核、真实token/消费或供应商账单。

新增37项，最终Linux全仓572/572；当前新协议37＋归属18＋旧历史读取2=57/57，临时Linux CRLF同组57/57。旧五套历史入口的9/13/31/23/13项仍在隔离固定源码中运行，不重复加入顶层总数。为保持这些历史测试，冻结依赖层新增3个自有MIT原文件，逐项核对旧pin；生产不导入历史快照或test-support。证据见[验证记录](validation/inline-production-validation.json)。

没有新增Windows实机、真实HTTP/供应商计费、模型遵循、语义支持或梦质量验收。Store保证仍限受管理文件及日志，不覆盖终端副本、外部备份/导出、文件历史/物理擦除或供应商留存。公开仅项目自有MIT代码、独立表述与虚构脚本，无第三方实现复制或私人正文/配置/密钥。

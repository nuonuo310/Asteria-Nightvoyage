# 直接引文：读取与独立评审适配

状态：`local_review_supported / live_entry_pending`。本切片接通生产 `inline-evidence-quotes-v1` 的评价读取、独立评审和内容查看；没有新生成协议、收费入口或价格批准。既有 coupled / continuity 合同继续使用原校验分支，其他离线 inline 身份不冒充生产协议。

## 合同与来源

| 输出或操作 | 约定 |
| --- | --- |
| appraisal view | 已完成 managed dream；核验来源/版本、运行与原梦幕一致、完整 before/delta/after checkpoint 链、新协议身份及执行 family；失败关闭 |
| 模拟评价 | `unchanged` / `estimated` 保持原声明；缺依据的 control / uncertainty 为 `not_stated`、value null；有字面依据仍仅 `model_estimate` |
| 直接引文审计 | 复制程序所有的 inlineEvidenceAudit，分别表示提供引文字段数和 intern 唯一数；不将程序内部表当成模型发来的表，不建立语义或情绪幅度保证 |
| review | 独立 `dream_appraisal_review` 条目；记录可信本地 reviewer、原梦/运行/幕编号、协议和 sceneFingerprint；素材 fictional 与 origin/nonfact 身份分别保存 |
| 保存与修订 | 同一 Store 原子提交正文与无正文请求索引；重复 request 重放，变化冲突；修订另存并指向原意见，原梦与原意见都不覆盖 |
| content view | 先梦，再醒来摘录，再模拟评价与依据、已有独立意见；醒来仍与梦分开校验，不把评审写成残片或现实记忆 |
| adapter | 既有 local_file 合同与方法；Asteria adapter 仍 pending，无自动评审、真实记忆/人格/任务写入或现实工具 |

纯 draft 构建器仍明确 `illustrativeOnly:true / runtimeSupported:false`；managed 层自己从 Store 生成上下文、保存正式评审，而不是把调用者的 draft 标签改成授权。调用者不能指定来源、parent 指纹或伪造 reviewer。`unchanged` 不接受 estimated 的方向判断；estimated 精确幅度只能 `not_established`。不同意见允许并存，兼容/冲突意见不改变原 delta。

读取不要求当前价格、未过期额度、活跃 client 或旧 profile pins 通过：这些是派发权限，不是历史阅读权限。本版 inline 记录始于具备 executionOwner 的生产核心，不反推旧记录归属或重标旧协议。新协议读取仍核验本协议固定 identity；未来更换 identity 需保留明确版本分支，不能默默归一化旧梦。

## 删除、撤回和存储边界

评审使用既有 Store，不新设正文缓存或旁路索引。删除单条 review 保留原梦和独立修订；旧请求不能复活已删除意见。删除原梦移除运行正文与后代，来源撤回立即屏蔽并清除关联梦、醒来、评审及缓存召回。既有日志在重启时先恢复清除，残留临时 snapshot 不能恢复正文。请求索引保留编号/hash 去重身份，不存评审文字；账本仍保留无正文费用元数据。

测试只用仓库外临时文件和项目独立虚构材料。首版保证限于受管理 Store 文件、日志与临时文件；不处理终端副本、外部备份/导出、文件系统历史或物理擦除、供应商留存。已经返回给调用者的内存副本也不能远程收回；再次通过 adapter 读取必须遵守撤回状态。

## 验证和限制

无需 Key，直接运行：

```sh
node scripts/check-inline-review.mjs
```

固定演练只使用明确提供的本地 HTTP 形状 simulator：先生成两幕及醒来，再独立保存/重放/修订意见、重开、经显式 dream id 调用既有内容 CLI、撤回并重开。CLI 使用测试 Store，不访问默认用户目录；稳定状态文件内容未变不等于 Store 无锁文件或恢复写入。演练只输出无正文检查汇总。

新增17项；最终 Linux 全仓589/589；新读取17＋生产协议37＋既有 managed review29＋adapter8＋content11＝102/102，临时 Linux CRLF 同组102/102。测试包括身份/审计/链篡改、纯 draft、不可覆盖修订、请求冲突、删除、来源撤回、实际子进程在日志写入后退出、重开清除、原子写盘失败，以及四笔独立虚构旧 unknown（8812800 micro-CNY）逐项保持。旧五入口嵌套套件9/13/31/23/13另列，不重复计入顶层总数。冻结测试层追加两个按旧 pin 核对的项目自有 MIT 原文件，仅用于临时旧源码项目；生产从不回退。

固定命令3次 stub 生成，评审/读取追加0调用、native fetch 0、Key读取0；original/billing 不变。合成使用量和金额仅检验算法，不是供应商账单。本轮未操作用户 Store、未释放历史 hold、未新增费用或外发授权；未新增 Windows 实机结果，未评审真实生成质量或情绪语义支持。详见[验证记录](validation/inline-review-validation.json)。

公开内容仅自有 MIT 实现、独立表述及虚构样例；没有复制第三方实现或私有仓库正文。下一步是新入口的依赖闭包、独立 profile/preflight 与历史保留审查；具体费用和虚构外发提案须另行确认，不能因读取测试通过开启 live。

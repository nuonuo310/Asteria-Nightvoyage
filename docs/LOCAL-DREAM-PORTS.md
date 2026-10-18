# 本地梦境端口 v1

状态：`local_file_plain_fake_supported / asteria_pending`。实现 scripts/local-dream-ports.mjs 的 LocalDreamPorts，把现有假模型引擎的输入、控制、保存与候选 API 封装成显式参数和带版本的返回；没有新生成算法、模型路由、远端服务、人格/真实记忆/任务写接口。它是[适配器差异设计](ADAPTER-BOUNDARY-DESIGN.md)的本地执行入口，不实现其待对接的权限认证、真实时效、跨系统确认或外部副本撤回。

## 创建与能力

new LocalDreamPorts(absoluteDirectory) 显式创建或打开仓外单机 Store；调用者持有并在工作结束后 close()，不在尚有执行活动时关闭。不接受第二参数、provider、Key、URL、fetch、模型或执行实例注入。只有固定 plain-fake-v1；已存在专用运行标记的 Store 拒绝接管并释放 owner 锁，不能拿它打开既有真实试跑目录来生成。读取真实试跑的既有梦簿仍使用原阅读器。

创建会执行既有 Store 启动恢复，不是无写入探测；在拒绝专用 Store 之前也可能发生其启动日志恢复，因此不能声称拒绝路径文件零变化。单 owner、目录/符号链接、日志、撤回及备份边界沿用 [CONTRACT.md](CONTRACT.md)。不新建第二权威梦簿，不新增或放宽既有会计、批准、期限或占款规则。

capabilities() 返回 contractVersion=local-dream-ports-v1、adapter=local_file、executionFamily=plain-fake-v1、materialKinds=[fictional]、asteriaAdapter=pending、realModelRequests=false、automaticDelivery=false、remoteAuthentication=false、deliveryAcknowledgement=false 及方法清单。它只声明本地对象能力，不授予远端认证、付费许可或 Asteria 兼容性；返回是可独立修改的副本。

## 显式合同

除 capabilities()/close() 外，每个方法接收一个对象，拒绝未列出的外层字段、访问器及非 JSON 数据；有限深度/体量沿用既有 JSON 数据 guard（总字符上限100000）。patch 另按下表封闭，snapshot/config 内部沿用原有规范化与限制，不伪称它们所有扩展字段都报错。下列每个返回均额外带 contractVersion。错误沿用核心固定业务码/存储错误；这不是有认证的网络错误协议。

| 方法 | 输入 | 返回 |
| --- | --- | --- |
| readSnapshot | {file}，绝对显式本地文件 | {snapshot}，经 FileSnapshotAdapter 和原规范化器；文件属于可信本地输入，不是受限上传接口 |
| start | {requestId,sessionId,snapshot,config?} | {runId}，仅持久启动，不代表已生成；外发 grant 不使假模型变成真实模型 |
| execute | {runId} | Promise<{dream,wake,residue,associations,receipt}>，另带版本；dream 可为 null |
| status | {runId} | {receipt}，状态/已存幕/预算/错误码 |
| cancel | {runId} | {receipt}，核心持久取消规则 |
| resume | {runId} | Promise<同 result>，仅核心允许的恢复；没有 retryUnknown 字段或自动重试 |
| result | {runId} | {dream,wake,residue,associations,receipt}，候选不隐含混入 |
| readEntry | {entryId} | {entry}，原保存条目或 null；可能含内嵌 wake/residue，分类型交付用 result |
| listEntries | {} | {entries}，核心无正文元数据目录，含原梦/回想/续写类型；不是仅原梦的日常 reader 目录 |
| append | {entryId,kind,text} | {entryId}，新 recollection 或 imagined_continuation，保留父来源，原梦不覆盖 |
| setPolicy | {entryId,patch:{cherished?,recallAccess?}} | {entryId}，珍藏与 manual/cue 访问分别管理 |
| recall | {cue,requestId,now} | {candidates,automaticDelivery:false}，显式时刻，零或一条字面候选，来源与到期保留 |
| residue | {entryId,now} | {residue}，模拟余韵或 null，不写日常情绪 |
| withdraw | {sourceId} | {sourceId,status:withdrawn}，源 ID 级撤回；未知源也可建立单调 tombstone，不表示曾有该源正文 |
| deleteEntry | {entryId} | {entryId,status:deleted_or_unavailable}，不暴露是否原先存在；删除原条目及关联正文 |

request/session/run/entry/requestId 使用既有 safeId；sourceId 使用既有撤回合同。来源与回想/续写身份仍由核心生成。用户文本只作数据，没有工具或任务执行。返回对象可被调用者修改，不影响持久原文；已交付副本无法远程收回，重新读取须重新检查。

控制方法检查既有执行 owner；专用运行不能被普通假引擎接管。重复请求复用既有 run，改变内容冲突；重复 execute 不再次调用。resume 不接收 retryUnknown，模糊尝试须停下复查，不通过新 ID/目录重试；已提交幕的失败 checkpoint 可按剩余预算恢复。任何存储异常不返回成功启动/撤回承诺，沿用 Store 失败关闭语义。

明确时刻不等于可靠时钟：recall 沿用核心字面回执/过期规则，没有新增单调时钟或真实白天循环。需要防时钟倒退的虚拟演练仍使用 [DAYTIME-CUE-SIMULATION.md](DAYTIME-CUE-SIMULATION.md)，不要把它的约束移植成此薄封装已实现的保证。

## 独立虚构端到端演练

```sh
node scripts/check-local-dream-ports.mjs
```

脚本拒绝全部参数，只创建/清理自己的系统临时 Store，使用 examples/adapter-boundary.snapshot.json（五通道、独立虚构、全部禁止外发）。readSnapshot → start/execute → 分类型 result → 独立回想/续写 → 同请求重放 → 候选召回 → close/reopen → 临时源撤回 → reopen 后原梦/派生/旧候选为空。仅3次固定假模型调用、重放追加0、凭据读取/传输尝试/真实请求0，不访问用户 Store。没有跨系统投递确认、真实模型质量或 Asteria 兼容性测试。

新增8项测试覆盖端口参数/身份、文件输入与返回副本、原梦不覆盖、策略/余韵分离、持久重放/取消、已有幕恢复、模糊尝试阻断、专用 owner 拒绝且释放锁、删除/撤回重开和保存失败不发成功回执。底层进程崩溃/预算/日志恢复反例仍由既有 lifecycle/execution-owner 等回归覆盖，不把这个薄封装说成重做了可靠性系统。

Linux Node v24.19.0 结果见 [local-dream-ports.json](validation/local-dream-ports.json)。Windows 新入口尚未实机验证；已有别的脚本回报不能替代此项。实现/样例/测试位于付费源码清单之外，不修改 src/fixtures/package；无第三方依赖/代码复制，不包含用户梦簿、私有原文或凭据。

## Windows 实机回报 · 2026-10-18

用户在 main ca70563、Node v24.19.0／win32 运行 test/local-dream-ports.test.js，8/8通过，并回报独立临时自检通过：3次假生成、重放追加0，原梦/派生分离、重开及撤回屏蔽成立，凭据/传输尝试/真实请求0，未访问用户 Store。范围仅针对8项与此脚本，不是 Windows 完整855项或 Asteria/质量验收。详见 [聚合回报](validation/user-local-dream-ports-windows.json)。当前切片验证收尾，不要求重复运行。

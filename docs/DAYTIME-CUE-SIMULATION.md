# 虚拟白天：显式线索演练

状态：`local_virtual_simulation / no_automatic_delivery`。复用已有 Nightvoyage.recall，按调用者明确提供的虚构线索与虚拟时刻推进。没有模型请求、系统定时器、真实白天状态监听或 Asteria 接口；候选不自动注入对话、改记忆、人格或任务。这不是语义检索，也不是用户日常可用性的验收。

## 输入与输出合同

实现位于 scripts/daytime-cue-simulation.mjs，导出 runDaytimeCueSimulation(engine,plan,{signal})。调用者拥有已有 Nightvoyage 实例及 Store 生命周期，沿用其 owner 锁和恢复规则。本轮文件位于付费源码清单之外，不改 src、fixtures、package、清单/图、合同、批准、价格期限或旧占款。

plan 是封闭 JSON：schemaVersion=1、kind=fictional-daytime-cues-v1、materialKind=fictional、clock=virtual、recallAllowed=boolean、events 数组。recallAllowed 是可信本地调用者的显式许可断言，不是认证系统；false 时只接受空 events，返回 denied，不能夹带被拒通道素材。当前没有接收真实线索、隐式后台采集或 Asteria 实时状态的入口。

每个 event 只有 id、cue、at。id 使用 safeId 且最多96字符，cue 沿用非空/最多200 UTF-16 code units限制，at 为非负安全整数且留足60000毫秒到期空间。每批最多10个事件；全批形状、身份冲突、时钟与容量先验证，再产生新回执。虚拟时钟是显式测试刻度，不代表正在经历真实白天或可校准真人情绪。

| 返回 | 约定 |
| --- | --- |
| 外层 | origin=dream_daytime_simulation，materialKind=fictional，isRealityFact=false，clock=virtual，status=completed/denied/cancelled |
| 事件 | id、at、status=candidate/no_candidate/suppressed/cancelled，candidates 单独数组 |
| 候选 | 沿用 core 的 origin=dream、输入素材身份、非事实标志、sourceRefs/derivedFrom、醒来残片、literal_scene_match 与原 expiresAt |
| 接收边界 | automaticDelivery=false，asteriaAdapter=pending；没有自动执行/注入、真实记忆写入或待办动作 |

no_candidate 不擅自细分成“已遗忘”或“没有意义”：它可能是字面不匹配、原回执过期、访问策略或原梦不可用。字面命中也不代表残片包含该线索，更不代表有语义关联——既有匹配在原幕中进行，交付的是独立醒来残片。

## 保存、去重和时钟

同一 Store 新增 daytimeCueSimulation={version:1,lastAt,events:{id:{fingerprint}}}。它只保存虚拟时钟、事件编号和标准化线索 hash，不保存线索或候选正文；hash 不是加密，也不保证低熵线索不可猜测。沿用 core 的 day-<id> 回执保存父编号和原到期时间，不建旁路正文索引。

事件身份绑定小写字面线索。at 是本次送达/重读时刻，允许同 id 在稍晚时刻重放；换线索则冲突。先前请求命名空间被其他调用占用时拒绝，不默默接管。每次送达必须不早于持久 lastAt，重开也不能倒退时钟重新展示已过期候选。同一请求不续期；新的线索事件可以再次命中仍保留且允许 cue 的梦，这不等于重新生成，也不等于原候选续活。

首版最多持久登记100个事件身份，达到上限停止；不自动淘汰去重身份、清空状态或迁移旧回执。无后台循环、真实时间自动触发或时间旅行恢复模式。将来真正白天适配器需要独立的实际时钟、接收权限和交付约定，目前不声称已兼容。

新事件的驱动元数据与 core 召回回执在同一 Store 保存中提交；重放只推进送达时钟，不重设原 expiry。每个事件单独提交，中断可能留下已完成前缀；调用者须显式再提供计划，不能重放早于 lastAt 的步骤。保存失败不交付成功或候选，Store 失败关闭；重开遵从已提交的回执和时钟，不自动重发。

## 撤回、取消和候选交付

每次操作重读原梦；在持久化之后及整批返回之前，再检查原梦存在、cue 访问策略和候选到期。后面一个事件导致过期、来源撤回或删除时，本批尚未交付的较早候选正文也屏蔽，status=suppressed。珍藏、梦中情绪与模拟余韵不参与这个命中开关；manual/cue 是独立控制。原梦、醒来、评价与账本保持原样。

signal 是标准 AbortSignal。开始前已取消则不写数据；提交之后观察到取消时，停止后续事件并抑制本次尚未返回的全部候选正文。取消只作用于这个同步调用，不是持久后台任务或生成任务的终态；既有生成取消合同保持不变。没有模型、网络或计费重试。

来源撤回/删除继续由既有 Store journal 清除关联正文；新索引只有无正文元数据，不能通过重开或恢复拿回候选。已交给调用者的旧对象不能远程收回，后续读取必须重新经过状态检查。边界仍限受管理 Store/日志/临时文件，不处理终端、外部备份、调用者副本、供应商留存或物理擦除。

## 独立虚构端到端检查

```sh
node scripts/check-daytime-cues.mjs
```

命令没有用户数据目录选项，只创建并清理自己的系统临时虚构 Store。先用既有 simulator 完成两幕及醒来（3次假调用），然后依次验证命中、无关线索不命中、重开重放不续期、到期为空、新事件重新命中、倒退时钟拒绝、撤回后重开为空。输出仅机制汇总；不输出梦/线索正文、实际编号或路径，不访问用户梦簿，不新增真实调用。

额外测试覆盖整批预检、每批/持久容量、输入身份、拒绝许可、命名空间冲突、访问策略与珍藏/余韵独立、整批交付时抑制、取消、保存失败、候选副本突变、索引异常和 Key/native transport 守卫。证据见 validation/daytime-cue-simulation-validation.json。

本切片是可运行的虚拟昼间演练，不把它写成真实长期白天自动浮现已经实现。下一步先验证 Windows 相同虚构脚本，再评估是否有必要设计实际白天接收口；不为此自动新增付费样本、接入私人数据或改 Asteria。自有 MIT 独立实现，无新依赖或第三方代码复制，无私有研究原文。

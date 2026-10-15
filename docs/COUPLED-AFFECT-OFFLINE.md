# 成对情绪合同：独立假模型闭环

本阶段实现 `offline-coupled-affect-quotes-v1`，用明确本地 simulator 接入原 Nightvoyage/Store。分幕 → 持久化 → 醒来摘录 → 重开读取 → 带来源线索召回的假闭环已执行。不是新的真实模型试跑，没有付费 selector、凭据读取、额度创建或占用释放。

## 合同和保存

沿用[离线对照](COUPLED-AFFECT-OFFLINE-REVIEW.md)的 affect 两分支：明确 unchanged，或 estimated 同时带 delta 和当前引文编号。共享纯字段解码器提取至 `src/coupled-affect-wire.js`，离线比较和模拟运行使用同一规则；旧对照返回仍只有聚合。所有原 v2 引文、数值、评价依据守卫保留，合法未使用引文的删除/重编号仍先通过整表校验。没有推测引用、修复请求、改掉 supplied delta 或自动选择 unchanged。

场景保存独立协议身份、原 before/delta/after、明确依据、原归一化计数，以及程序按合格分支写入的 `affectDeclaration:{schemaVersion:1,kind:...}`。模型输出同名元数据或额外顶层字段会被拒绝。首次 queued 保存协议、归一化策略和 `explicit-affect-union-v1` 身份；执行/恢复核对身份及已有完整场景链。旧协议场景和新版本检查点不混用，不迁移真实或失败记录。

检查点重开重新规范验证场景/依据/计数，核对 declaration 与已存依据及零变化关系，不把“明确不变”误读成另一种带依据估计。无法证明被删除原表的确切内容；本地受管理 Store 仍是信任边界，没有增加签名或真实响应存档。

共享 `readAppraisalView` 新增显式版本支持；为新场景额外显示模型分支声明，标为 model_declaration / shape_only / 非现实事实。无情绪依据的 affectChange 仍为 not_stated/null；unchanged 的明确声明另列，不能把 null 说成没有读取或把声明说成真实感受。有依据的零估计仍保留引文和 estimated 身份。模拟情绪、醒后余韵、珍藏和日常召回访问权限继续分开。原梦不被回想/续写改写。

醒来继续使用旧严格政策：从实际保存的某一幕选连续逐字摘录，不添新后续、不拼接、改写或强制产生启示。醒来是单独记录，梦境事件不是现实事实；来源编号/版本、fictional 素材身份与 dream/wake_note 来源随各记录和召回保留。

## 模型边界和恢复

模拟 provider 必须显式传入 simulator，没有默认网络函数或 Key 参数。JSON 请求仍不使用工具、streaming 或 thinking，每次最多 400 输出 tokens；原 parser 在任何归一化前检查 usage/JSON 和 `maxOutputTokens*3` 字节上限（默认 1200）。程序增加的声明、审计不作为模型响应来扩大配额。脚本中的 token usage 是模拟值，Fake engine 的请求预算是字节估计，不能当真实 token、成本、发票或计费原子性证据。

默认最多两幕加一次醒来。调用/输出/超时预算仍限制假运行；取消排队不调用，生成中取消或撤回抑制迟到响应；已存一幕后取消不再发下一阶段。进程在场景提交后退出，可显式恢复剩余两个假阶段而不重生第一幕。dispatch 后退出重开为 uncertain，普通 execute 不调用，未明确允许未知尝试的 resume 拒绝。显式 fake retry 的原合同仍在，不能将其视为真实 unknown 账项重试授权。保存失败关闭存储并阻止梦境或半套声明/审计发布。

撤回/删除通过原持久 journal 清除受管理场景、依据、声明、计数、后代与召回，重开或旧 cue 不恢复正文。没有新增缓存、索引、日志正文或备份。已交付副本、外部备份、用户终端、服务商保存与物理擦除仍不由首版自动处理。三个真实 unknown 占用和旧付费入口完全未动；既有九个 live 源码 pin 仍通过。

## 证据和下一步

19 项新测试涵盖场景/数字不变、分支声明、篡改/跨版本检查点、请求例子与权限、400/1200 拒绝、无 simulator/default transport、无修复、完整假闭环及回想不覆盖、取消/超时迟到、生成中撤回、删除/重开/旧召回、上限、真实子进程提交前后退出及保存失败。共享读取视图和旧离线比较模块有改动，因此完整 Linux LF **252/252** 回归；临时 Linux CRLF 副本只跑新19＋旧对照19＋既有视图7，**45/45**，不是 Windows 原生或全套 CRLF 结果。

首次定向 35/35；追加故障用例后的首次全套 251 通过、1 失败，是测试误写 delete 而非既有 deleteEntry 方法；修正测试后取得最终 252/252。未为此修改运行时。独立检查脚本完成三次假调用、重开、零重复、两幕声明与审计、一个带 dream/非事实身份的 cue 候选，撤回后候选为零、视图为空。直接证据/范围/源码摘要见 `docs/validation/coupled-affect-offline*`。同作者复查，不是独立审计。

本地复现无需 Key：

```sh
node scripts/check-coupled-affect-offline.mjs
```

这些都是独立虚构脚本，不证明真实模型更少遗漏、引文语义支持、真实情绪、400-token 实际可装下所有合法情况或梦境质量。没有打开用户梦簿/账本、复制第三方实现、新依赖或跨仓库写入；全为本项目 MIT 模块。Asteria 适配器待对接。下一步先核对候选的请求/大小边界与预算集成设计，再决定是否值得准备新的门控入口；现在不发真实试跑命令。

后续 Windows 独立脚本 happy path 已由用户报告完成，聚合见 `docs/validation/user-local-coupled-affect-offline.json`；不扩展为完整 Windows 测试报告。[大小边界与预算设计](COUPLED-SIZE-AND-BUDGET-DESIGN.md)已给出实际边界探针和历史读取耦合复现，尚未实施新的预算协议。

# 分幕候选：独立模拟运行路径

已实现 src/scene-continuity-rehearsal.js：ContinuityRehearsal / OfflineContinuityProvider。身份 offline-scene-continuity-runtime-v1，显式绑定 promptCandidateVersion、提示文本 hash 和 budgetKind=fake_byte_estimate_only，首次 start 保存即包含这些字段。**这是实际执行过的本地模拟机制，不是已完成的付费入口或真实生成质量验证。**

## 已实现的运行行为

复用自有 Nightvoyage 核心、仓外 Store 和 journal，不复制/另造一套梦簿或人格记忆。provider 必须由调用者显式传入本地 simulator；拒绝 mode/live/credential/fetchImpl 等运行选项。没有 native fetch、key 加载、live selector 或新账本账户；现有付费 core/profile 的 25 source pins 未改变。

每次模拟生成前，用候选比较器重建实际请求，检查 65536-byte 限制，再将 candidate 请求交给模拟器。第二幕 system prose 包含提示增量，首幕/醒来不追加它。不是在账本记录之后偷偷替换 transport body；本路径根本不做金额结算。

场景沿用耦合评价与依据 wire 的确定性规范器，保存时使用独立 offline runtime checkpoint 身份；恢复时显式验证并在副本上转换为比较器所需的基础 wire。原梦仍为 origin=dream/isRealityFact=false、素材为 fictional，sourceRefs 与醒来记录分别保存；fake 素材 grant.modelEgress 始终为 false，不能直接拿外发已开材料进入模拟器。

固定为最多两幕、一次醒来，输出 cap=400。使用旧核心的取消/排他执行/持久阶段/请求与会话去重；醒来必须逐字摘录已保存某幕。验证失败不修复、不新增隐式调用。

## 预算与恢复保证的精确范围

- fake calls / input / output reservations 有上限，耗用后不靠失败重置；超界不再到模拟器。**input 是核心 payload 的 byte/3 估算，不包含 system prompt，也不是模型 token 用量。** 输出 JSON 大小/协议 usage 检查仅用于模拟形状约束。
- 请求真实序列化 bytes 单独检查，不提高 65536 上限；即使 provider 在派发前因请求过大拒绝，核心已经登记的 fake 调用尝试仍保留。
- queued cancel 不调用；in-flight cancel/timeout/source withdrawal 使信号中止或抑制迟到输出。持久场景后取消阻止后幕和醒来。
- 相同请求/会话、已完成重开不会重新生成。原梦删除或来源撤回后，不能重放恢复正文；原 journal 清除路径在重开继续生效。
- resume 仅接受已有完整持久场景前缀且调用尝试数恰好等于场景数、全部为 received 的情况，并需显式调用；不替用户猜测恢复。dispatch 中途进程退出，即使已有一幕/两幕，仍属未完成尝试，不允许补跑。已保存一幕后自然退出可显式续剩下两阶段，前幕不再生成。
- 初始/执行保存失败使 Store 不可用，不能继续派发。旧独立虚构历史账项三笔 unknown 共 6,609,600 micro-CNY 在该模拟路径执行/撤回后不变；这不是新一次用户账户审计、退款或金额验证。

此阶段**没有新增 monetary reservation、真实 usage settlement 或候选 paid ledger 原子发布保证**。不能把 fake cap 通过写成 3 元付费预算验收。金额机制仍需下一阶段受门控集成并独立测试。

## 可复现完整模拟

```sh
node scripts/check-continuity-runtime.mjs
node --test test/scene-continuity-rehearsal.test.js
```

固定脚本只在新的仓外临时 Store 使用公开独立虚构、预写的两幕/醒来响应。它完成保存→重开→去重→cue recall→来源撤回→再重开，不打印正文、引文、实际 id/指纹或配置，结束后清理自己创建的临时数据。探针禁止 native fetch/key 读取，计数为 3 次 fake stage、0 次真实请求/密钥读取。

手写响应是测试输入，**不是候选提示词产生的梦，也不证明更自然或少重复**。没有给这些响应排名，不要求普通梦变成超现实故事。

Linux Node v24.19.0：22 项新增；模拟运行器+提示候选+已有 coupled budget 定向 56/56；Linux CRLF 临时副本新增 22/22。实际子进程退出覆盖第 1/2/3 次 dispatch 和持久前幕之后；没有新增 Windows 运行或全套重跑。证据 docs/validation/continuity-runtime-*。

## 下一阶段运行方案：尚未启用

参见 SCENE-CONTINUITY-PAID-PLAN.md。生产读视图/本地复核适配器目前支持的 paid coupled 协议不冒认本实验身份；尚未给它们增加本实验的兼容声明，也没有 Asteria 接口。本阶段只用核心 result/read/recall 和 source identity 完成模拟。

所有代码来自本项目 MIT 独立实现/对已有自有核心的复用；无第三方实现复制、新依赖、私有原文或跨仓库变更。旧原梦/已批准入口/预算/unknown 均未更改，未访问用户运行目录。

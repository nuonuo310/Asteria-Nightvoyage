# 本地端口接手复查 · 2026-10-18

基线：beb21780c061363b7f882cba93e7307d8e6f0e8b。本轮是实现者接手后的只读源码复查，不是第三方独立审核、渗透测试或新的运行验收。没有重跑测试，没有访问用户 Store、凭据、真实模型或其他仓库。

核对 scripts/local-dream-ports.mjs 与 src/engine.js、src/store.js、src/contract.js、src/adapters.js 的调用关系，以及 test/local-dream-ports.test.js、既有生命周期/执行 owner 测试路径。Git 对照确认自 ca705636651baaff273d9ce7e8619c67ba4136a3 起 src、该端口、自检和端口测试未变；此后的 Windows 修正仅涉及另一 bootstrap 测试的预期和文档。

| 关注点 | 源码观察 | 保留边界 |
| --- | --- | --- |
| 执行权 | constructor 固定构造普通 Nightvoyage；已有 run 逐条检查 owner；执行/恢复/取消/状态/结果继续检查 | 不接受 provider/Key/URL/fetch 注入；不是阻止恶意本地 JavaScript 的沙箱 |
| 输入 | 外层 fields 先验证 JSON 数据再读取属性，拒绝 getter/未知字段；start 仍走 snapshot/config | 五通道权限来自可信本地断言，不是远端认证或时效证明 |
| 原文与输出 | 核心 read/list 返回副本；result 分出 dream/wake/residue/associations/receipt；append 独立派生 | readEntry 是保存条目，可内嵌 wake/residue；需要分类型交付用 result，不猜测自然语言 |
| 取消 | cancel 先持久终态再中止 active controller；后续阶段与迟到输出检查运行状态 | 不保证远端服务停止或退款；本端口本身无真实提供商 |
| 恢复与预算 | resume 只接 runId；核心默认 retryUnknown=false，owner 检查阻断专用运行接管 | 不暴露新 ID/目录绕开历史或额度的恢复捷径；constructor 先执行 Store 恢复，拒绝专用 Store 不是零写入探测 |
| 撤回与读取 | Store 先持久 tombstone，清理依赖 run/entry；启动先重放 journal；read/recall 使用当前条目 | 成功撤回的保证限受管理正文；持久化前失败不能声称重启保证，需修复后重试 |
| 候选与余韵 | recall 独立返回 candidates，automaticDelivery=false；residue 独立衰减 | 沿用核心字面匹配/显式时刻；没有新增单调时钟、语义检索、自动投递或 Asteria 日常情绪写入 |
| 删除和策略 | deleteEntry 使用既有 journal；setPolicy 由核心检查原梦/字段；回想续写不覆盖原梦 | 外部返回对象、终端、备份、供应商留存与物理擦除不在保证内 |

在上述范围内，本轮未发现需要立即修改代码的实质问题。此结论不表示全局无缺陷，也不提升为生产/多机/不可信上传/真实素材支持。

动态证据仍是已记录的 Linux 855/855 与用户 Windows 855/855统计；后者尾段没有重报精确 commit/Node，身份限制见 [Windows 完整回报](validation/user-local-windows-full-pass.json)。本次源码阅读不能替代这些测试，也没有新造一个测试通过结果。

当前决定：固定假模型本地工程基线停稳，不继续为了延长施工添加桥、缓存或确认系统。后续以明确的使用缺口或双方已核验接口合同开切片；新付费、私人材料、跨仓库或破坏性操作仍单独确认。梦境质量、人类验收及真实 Asteria 接入保持未完成。原先失败历史和 unknown 占款规则不改。

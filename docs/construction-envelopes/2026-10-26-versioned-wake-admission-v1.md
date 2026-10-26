# 夜航 · 版本化源码准入与刚醒心情一次接入（2026-10-26）

状态：总控施工边界，独立草稿候选。目标是在**同一轮**解决旧源码 pin 与“刚醒时心情”候选的冲突；不把只改清单当作产品完成，不承诺真实模型或主观感受。

## Opening Gate

- 仓库：`nuonuo310/Asteria-Nightvoyage`；权威 `main@249d38ab6eb65aeab3207771062b0e51b962bd4d`。先核对本地/远端、工作树、`AGENTS.md`。若 main 已前进，比较后停下回报，不自行换基线。
- 设计参考：PR #94 `79ad750140ca0b0beb48e1b46ffd175ae4433ecd` 的 `docs/WAKE-AFTERGLOW-INTERACTION-DESIGN.md`；阻断记录：PR #96 `a7b775bd45048db0b12b7651206c0faa0f4cfeeb`。均只读，不合并或继承它们的许可。
- Windows 未提交 WIP：`C:\\Users\\Administrator\\Desktop\\Asteria-Nightvoyage-NV-WAKE-FIRST-FEELING-01`，分支 `codex/nightvoyage-wake-first-feeling-01`。先列出状态并保全五个 WIP 文件；不要 reset、clean、覆盖或直接当成已验收实现。WIP 9/9 与邻接 40/40 是施工者报告，完整测试 1,764/1,931、167 失败、exit 1。
- 只在新的独立 worktree/分支施工；旧 WIP 可作为只读输入。不得改 main、原 WIP、#94/#95/#96、历史付费提案、许可、账本或用户 Store。

## 核心裁定

`src/inline-entry-preflight.js` 的 `inlineEntryInventory()` 递归纳入整个 `src/`、`fixtures/` 和 `package.json`；旧 `src/inline-entry-review.json` 是已冻结的精确清单。新增 `src/wake-first-feeling.js` 或 `fixtures/wake-first-feeling.json` 后，旧入口在新检出必须继续报 `source_inventory_changed`；旧付费合同必须继续报 `paid_contract_source_changed` 或等效失败关闭。**不刷新、重签或覆盖旧清单来让旧许可在新源码上通过。**

这是一次有意的版本迁移，不是把新文件移到漏检路径。新的非付费功能若进入 `src/`，必须有自己明确的源码/数据版本和独立验收；旧入口只在原冻结源码身份下证明可用，在新身份下证明拒绝。历史测试如假定“任何当前 checkout 都匹配旧清单”，应改为同时验证这两种身份，保留旧合同拒绝漂移的反例；不得删除、跳过或简单改成恒真。

## 唯一交付

1. 先作可审查的依赖图：旧 pin、旧付费入口、测试假设、新 WIP 的触点及所有 167 失败的归因分类。列出原冻结基线与新检出的两种预期。若无法安全区分历史身份，停在设计与 blocker，不动旧门禁。
2. 在新版本身份下整合“刚醒时心情”最小候选：它与原梦、逐字 `wake.fragment`、模拟 `residue`、后来回想独立；有独立身份、时间顺序、来源及撤回语义。旧梦不迁移、不回填；无可信文本则缺席，不从 valence/arousal、fragment 或 residue 自动推情绪。虚构叙事不得宣称模型或现实中的沈述具有已验证主观体验。
3. 合成 Store/fixture 覆盖有值、无值、不确定、负向或噩梦、旧记录、重复追加/读取、重开、删除、来源撤回、转义和阅读无内容隐藏；原梦与旧账保持不变。禁止真实用户 Store、Key、网络模型、付费请求、Asteria 接入或前端美化。
4. 旧入口仍必须在当前新检出拒绝；在精确历史源码身份下按原证据验证旧行为。新候选不能得到旧付费授权，也不产生新的付费 profile、价格快照或 live 开关。给出一份新旧身份对照及故障注入反例，证明没有目录挪动、测试跳过或旧许可复活。
5. 跑定向、相关付费回归、完整 `npm.cmd test`、源码准入与合成梦闭环。保存准确命令、环境、退出码、测试实数和失败分类；若完整套件不能证明旧入口失败关闭与新功能通过，保留 BLOCKED，不提交“全绿”结论。

## 停止与交付格式

- 完成时仅一个独立草稿 PR：列出具体文件与版本身份、旧合同 fail-closed 和历史基线正例、两幕加醒来合成证据、全量测试及剩余限制。草稿未复审前不 ready、不合并。
- 若必须改旧付费协议、放宽清单匹配、移动实现逃避 pin、读取用户 Store，或无法让历史测试在精确基线上运行，立即停于 `BLOCKED_VERSION_ADMISSION`；保留 WIP，不自动开下一个包。
- 本包不批准新的梦境生成、模型额度、真实凭据或任何旧调用重试。费用、真实语义质量和主观感受不在本包验收内。

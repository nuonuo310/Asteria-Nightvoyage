# Asteria-Nightvoyage · 夜航

独立运行的实验性梦境层：获准的虚构快照 → 最多两幕梦境及模拟情绪 → 独立醒来残片与余韵 → 带来源身份的字面线索召回候选。Node.js 24+／JavaScript，MIT，无运行时依赖。

**当前状态：第一阶段本地工程闭环已有实现与有界证据；梦境总体质量尚未验收，Asteria 适配待对接。** 梦境事件始终不是现实事实；不会写入真实记忆、人格或任务，也不会执行梦中文字中的现实工具指令。当前仅支持虚构素材。

[第一阶段收口核对](docs/PHASE-ONE-STATUS.md)逐项区分代码、机制测试、用户实机回报和未完成事项；[进度记录](PROGRESS.md)保留历史切片与限制。下方是当前入口，早期模块文档中的“本轮未支持”描述仅适用于其当时切片，不能替代当前状态。

[未来适配器差异设计](docs/ADAPTER-BOUNDARY-DESIGN.md)区分现有本地合同与未接通的权限、版本、接收确认和外部撤回；附独立虚构快照与现有 API 演练。不是 Asteria 兼容声明，也不启用新生成许可。

## 日常查看已有梦簿

在仓库目录执行：

```sh
node scripts/dreambook.mjs list
node scripts/dreambook.mjs read --latest
```

list 只显示无正文目录；read 显式在本地终端显示最后一条可见原梦、醒来残片、模拟评价和分别署名的独立意见。latest 按持久插入顺序，不编造创建时间。中文状态解释不改写备注；追加 --review-json 可查看完整评审绑定。没有已有 Store 就停止，不创建新账户。详细路径、协议与恢复边界见[梦簿阅读器](docs/DREAMBOOK-READER.md)。

阅读不调用模型、不需要 Key、不产生新评审。Store 启动锁与日志恢复可能写入文件，不声称整个生命周期零写入。终端中显示的正文属于本地梦簿内容，不必贴回公开仓库。

## 开发与独立虚构演练

```sh
npm test
node scripts/check-dreambook-reader.mjs
node scripts/check-daytime-cues.mjs
node scripts/check-local-appraisal-review.mjs
```

Windows PowerShell 若阻止 npm.ps1，使用 npm.cmd test。上述 check 脚本仅使用自己的临时虚构 Store，不读取用户梦簿，不读取凭据或请求真实模型。虚拟白天演练是显式线索和虚拟时间，不是后台监听、语义检索或自动投递。

最新已有证据：Linux／Node v24.19.0 完整测试847/847；用户 Windows 阅读器针对测试11/11，另有独立脚本回报。二者不是 Windows 完整套件验收，假模型测试也不是生成质量验收。证据与精确范围见[第一阶段状态](docs/PHASE-ONE-STATUS.md)。

需要学习最初假模型接口，可看[虚构流程](docs/WALKTHROUGH.md)及 src/cli.js。创建实验数据必须使用源码仓库之外的绝对目录；不要为绕过历史额度、unknown 占款或去重状态而新建账户/目录。

## 真实模型与批准边界

已存在专用、合同绑定的 DeepSeek 付费入口。用户此前明确批准的一次 inline 虚构运行完成两幕与醒来，后续读取、无凭据重放和手动字面召回有用户实机回报；[单样本结果及限制](docs/INLINE-LIVE-TRIAL-RESULT.md)单独记录。不能把早期“尚无真实入口”的切片说明当作当前事实。

**当前没有批准新的付费运行。** 已完成许可受调用/运行上限约束，剩余金额不授予下一梦。价格、固定候选、虚构外发、凭据和费用须在下一次真实阶段重新核对并明确确认；不自动重试、扩额、续期或释放旧 unknown 占款。历史占款是保守会计状态，不是独立核验的供应商实际账单。

[专用付费进程](docs/INLINE-PAID-PROCESS-ENTRY.md)、[授权保存](docs/INLINE-TRIAL-AUTHORIZATION.md)及[受控依赖边界](docs/INLINE-LOCKED-PREREQUISITES.md)说明机制；阅读这些说明或运行离线测试不构成付费授权。旧协议、固定源码与旧批准不因安装新版本而自动兼容。

## 合同、保存与后续范围

- [输入、输出、控制与保存合同](docs/CONTRACT.md)：五通道快照、降级、独立产物、来源版本/权限、取消、恢复和撤回；未来 Asteria 提供同一规范化快照的实际接口尚不存在。
- [原始分阶段计划及现状](docs/PLAN.md)：A 文档、B 本地闭环、C 可靠性、D 真实阶段单独决策。
- [虚拟白天线索](docs/DAYTIME-CUE-SIMULATION.md)：字面候选、去重、过期、时钟与交付边界。
- [独立评审 CLI](docs/LOCAL-APPRAISAL-REVIEW-CLI.md)：明确提交的意见与原梦分别保存，不自动充当人工验收。
- [质量评估](docs/QUALITY-EVALUATION.md)与[有限内容评审](docs/INLINE-CONTENT-ASSISTANT-REVIEW.md)：结构/字面引文不等于情绪方向、精确幅度或总体质量已成立。
- [公开参考与许可证核对](docs/REFERENCES.md)：仅借鉴思路，无第三方实现复制；未来复制仍须文件级许可审查与明确确认。

原梦、醒来、后来回想、想象续写和评审分别保存；珍藏、召回访问、梦中情绪及醒后余韵分别管理。来源撤回立即屏蔽并清除受管理的关联正文，重开恢复不能重新暴露。保证范围仅单机受管理 Store、日志和临时文件；外部备份恢复、已返回副本、终端历史、供应商留存或物理擦除不受此保证。

公开仓库只包含独立表述、代码和虚构样例。不得提交真实聊天、私人记忆、梦簿/state.json、私有仓库原文、私人配置或密钥。尚无前端、Asteria 实时接入、真实素材支持或自动日间投递。

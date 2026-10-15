# 共享引文协议与单场复测入口

最新状态：用户已批准并本地执行本场复测，第一幕评价校验失败，未发布梦境；未知尝试保留预算，后续被阻止。Windows 原版本 148 项离线测试报告通过。完整限制和新增无正文诊断见 [失败复查](COMPACT-VALIDATION-DIAGNOSTICS.md)。下文提案/交付描述保留实施时背景，不能视为新的运行授权；勿重置或重复初始化绕过阻断。不迁移旧梦正文，不接 Asteria。

## 引文只输出一次

模型保留 `event / appraisal / delta`，将重复依据改成 `evidence` 表和 `links`。例如以下独立编写的合同片段（不是完整场景或生成结果）：

```json
{"evidence":["想让木轮转起来","拨开细枝后木轮转动"],"links":{"goal":[0,1],"control":1,"uncertainty":null,"affect":null}}
```

表内最多五条唯一引文，每条最多 64 个 Unicode code points，逐字连续存在于当前事件。字段使用从 0 开始的整数编号，相同引文共享编号；不要求模型数文本位置。越界、重复、未使用或不存在的引用均拒绝，不拼接、trim 或修复。

规范化后保存明确的依据文字，附程序拥有的协议版本、梦境身份和 `semanticSupport:not_assessed`，不保存一个脱离原幕的证据编号。非零目标影响需要目标/结果两项引用；缺控制或不确定性依据时用 0.5 兼容占位，缺情绪依据时两个 delta 为零。读取视图继续将缺依据项显示为 `not_stated / null`，与实际模拟计算分开。引用存在不证明语义支持，不引入启示、情绪配额、正向收尾或现实行动。

## 输出开销

| 预先脚本样例 | 展开依据 JSON 字节 | 共享引文 JSON 字节 | 减少字节 |
| --- | ---: | ---: | ---: |
| ordinary-no-goal | 255 | 248 | 7 |
| stated-goal-hindered | 509 | 441 | 68 |
| stated-goal-helped | 492 | 413 | 79 |
| affect-without-goal | 353 | 349 | 4 |

重复程度较高的 64 字符纯边界探针为 1384 → 575 字节，一条表内引文被多个字段共享。它没有叙事/语义质量含义。独立长引文仍可能超过整体限制，不保证任意合法字段组合都能容纳。

这些是 UTF-8 JSON 字节，实际模型 token 数仍为 null，不能据此估价或保证真实 token 减少。单次 API 输出封顶仍为 400 tokens，正文另有原来的 1200 字节门。超限即拒绝，不增加解释、评分、修复或自动重试调用。

## 预算核心及旧协议

现有 `GatedDeepSeekClient / BudgetedNightvoyage` 新增固定枚举 `compact-appraisal-v1`；默认仍为 `grounded-wake-v2`，v2 提示词文件及摘要原样保留。协议和版本构造后不可修改，不接受任意生产协议回调。真实模式仍走固定 DeepSeek endpoint 的 native fetch，不能注入 HTTP。

协议/额度身份与首次 queued 运行一同持久保存；首次保存后立即退出，也不会留下缺身份的待执行记录。execute/resume 核对同一协议与额度，禁止跨协议、跨账本续跑。缺新增标记的旧 v2 记录仍按 v2 身份处理。默认路径的旧机制测试继续通过；不倒写旧梦的新证据。

阶段正文、引文与费用结算仍在同一 Store 操作中原子发布。取消/撤回抑制迟到正文，来源墓碑在重开后先清除关联原幕/引文/醒来正文，再允许读。账本只存白名单计费元数据。没有新增正文缓存、索引、日志或自动备份。外部复制、旧备份、其他机器和物理擦除仍超出首版自动清除边界。

## 单场提案与原交付边界

`compact-appraisal-trial-20261015` 固定一场 `sparse-context`，最多两幕、一次醒来、三次调用，新增总上限人民币 3 元提案。它针对前一批稀疏输入的评价依据问题，不要求重复剧情，也不是统计性对照。原三组筛查必须已有九次结算；新额度独立，不重置旧账本。

CLI 为 `src/compact-trial-cli.js`。初始化需准确素材编号、新费用及虚构素材外发批准；源码素材仍为 `modelEgress:false`。获准后只在运行副本开放固定版本。默认沿用原源码仓库外 Store，Windows 为 `%LOCALAPPDATA%\Nightvoyage\first-fictional-trial`；支持 `--data-dir`，不得换目录绕过限额。

配置仅存来源编号/版本/摘要、三个协议源码摘要和额度元数据，无正文/密钥。素材/源码只规范化 CRLF/LF，其他更改拒绝。现有价格审核到期仍为 **2026-10-16 12:10 UTC**，未刷新或延长；真实运行前需重新核对当前提供商/价格并取得本场费用及外发批准。此前批准均已完成。

- `proposal / preflight` 无需密钥；缺批准文件时预检只读，不创建 Store/额度。
- `run --live` 明确开启运行检查；写锁内再次核对来源、身份、余额和期限后才读环境密钥。不传 live 不发送。
- 完成后 `read` 或重放无需密钥、不新增尝试；返回分开的 dream/wake/residue/associations/receipt，另有独立 `appraisalView`。
- 未结算请求、取消、删除或撤回会阻止继续。未知费用保留完整占用，不自动修复、换编号或退款。
- 只有已提交检查点且没有未知请求，显式 `--resume` 才继续剩余阶段。Ctrl+C 取消，迟到正文不发布。
- 本地文件仍使用同一 snapshot/Store 合同；Asteria 适配器继续标为待对接，没有假定兼容尚不存在的接口。

## 现在可运行的离线指令

```powershell
npm.cmd test
node scripts/check-compact-appraisal.mjs
node src/compact-trial-cli.js preflight
```

脚本使用临时目录、dummy credential、stub allowance 和内存传输，禁止 native fetch，不读真实密钥、不写用户梦簿。源码素材的授权副本只用于本地模拟；stub usage/单价是测试数据，不是真实 token/费用。

原交付时，未初始化预检应为 `ready:false / compact_approval_required / credentialRead:false`。其 Linux LF/CRLF 完整测试、脚本输出和源码摘要见 `docs/validation/compact-appraisal.*`。后续 Windows 离线报告与失败试跑见上述复查；真实模型质量仍未验收。现有用户预检为 `unsettled_attempt_requires_review`，新诊断无法倒填旧失败原因或解除保留。没有第三方实现或新依赖，全部使用本项目 MIT 代码和独立虚构探针。

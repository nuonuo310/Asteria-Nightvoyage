# 本地内容查看：先读梦，再对照评价

新增 src/content-review.js 与 src/content-review-cli.js，帮助阅读已经保存的 coupled 梦，降低完整 JSON 回执中账项/结构字段的干扰。**这是内容复核的准备工具，不是新一轮生成、自动评分或质量通过。** 已有单例内容结论继续见 COUPLED-QUALITY-REVIEW.md；不凭本工具完成而更改该结论。

## 用户本地命令

```sh
node src/content-review-cli.js read
```

默认只读取既有 Nightvoyage/first-fictional-trial 存储中 coupled-affect-dream-trial-20261016 请求对应的原梦。不需要 key、付费批准、未过期定价或生成源码 pin 匹配，不调用供应商，不续跑/初始化任何 account。仍校验当前保存内容的协议、来源、全幕链和醒来记录。尚未有结果则报告无内容；撤回/删除则不交付正文。

可显式选择既有外部目录与梦编号：read --data-dir <existing-directory> --dream-id <dream-id>。只支持当前 coupled 协议与虚构素材，其他协议不会按相似结构默认认定兼容。没有 --live、run、--resume、写评审、文件导出、密钥或工具参数。缺目录/缺 state.json、错误参数与 help 不创建账户或数据目录；正文仅交付本地终端，不写另一个文件缓存。

**逻辑只读，不是文件系统零写入。** 查看函数不修改 Store 状态/原梦/评审/账项，但命令打开现有 Store 仍需 owner lock，并沿用启动 journal 重放、清除 abandoned temp、状态恢复和原子保存。故中断后的存储可能产生必要恢复写入；有活 owner 则拒绝。稳定已完成的虚构样例验证 state.json 字节不变，不将其推广为所有启动都零写入。

## 展示与判断顺序

1. 保留梦境/非事实身份、来源编号和版本；先展示逐幕原文，再展示醒来残片、摘录幕号、独立醒后模拟余韵初始值和待验证联想。
2. 随后展示模型声明与 before/delta/after，及程序读视图给出的逐字情绪依据、goal/control/uncertainty。没有依据的 not_stated/null 不改成置信度 0.5；unchanged 与 estimated-zero 保持区分。
3. 已保存的独立评审意见单列并保留 reviewer/来源，不新增意见、不据此重算原数值。没有评审就显示空列表。
4. 人工只讨论三件事：后幕新增/延续了什么体验；事件和情绪方向是否有可解释但不唯一的联系；醒来残片留下了什么。允许平淡、难判断、无启示，不要求新奇/正向/固定末幕，也不认证精确幅度。

命令重验醒来片段与保存的 run.wake/canonical 摘录依据和来源身份一致，拒绝新编醒后事件/错幕/记录不一致。终端正文使用 JSON 引号转义控制字符，文本始终作为数据，不执行其中的命令。API 返回 narrative / appraisalView / reviews 独立字段与来源身份；不输出账本/密钥/配置，也不在摘要中把梦变成现实事实。

本地显示包含真实保存的梦文，**不要把完整输出或截图提交到公开仓库**。终端/转录/外部复制不在受管理撤回清除范围；旧副本无法从他人手中远程撤回。本轮开发只使用自有虚构 fixtures 的临时外部 Store，未访问用户梦簿。

## 可复现机制检查

```sh
node --test test/content-review.test.js
node scripts/check-content-review.mjs
```

固定脚本使用 3 次本地模拟调用准备虚构原梦，在 native fetch / key 属性拒绝探针下运行内容 API 和真正 CLI；只打印无正文摘要。检查读取函数不改状态、稳定存储字节不变、来源撤回后返回 null、现有 25 live pins 未变。不会读取用户试跑目录。

Linux Node v24.19.0：11 项新增；与 A/B/C 和 appraisal view 定向共 71/71；Linux CRLF 临时副本新增 11/11。没有重跑全套或新 reader 的 Windows 实测。证据 docs/validation/content-review-*。

另登记用户 23:30 报告的 Windows 本地适配器脚本结果（validation/user-local-review-adapter-windows.json）：拉到 f0df5b9，Node v24.19.0/win32，假生成 3 次、真实请求/密钥读取 0，分离输出/原梦账项不变/重开去重/撤回屏蔽均为 true。这是上一阶段固定脚本在 Windows 的报告，不是全套 Windows 测试、用户实际梦簿正文读取或独立本机字节审计；不扩充为本 viewer 的实测。

下一步用现有已保存梦作有限阅读，提出带评审者身份的观察；仍不改原梦，不自动另存评价、不发起新付费调用，不用机制测试替代质量验收。Asteria 待对接。自有 MIT 实现，无第三方代码/私有原文复制、新依赖或跨仓库改动。

用户随后报告在 Windows 拉到 743ec23 后成功显示同一已保存梦的两幕、醒来摘录、来源与分离评价；汇总见 validation/user-local-content-reader-windows.json。新增的是本地读取证据，不是新生成样本、全套 Windows 测试、磁盘字节对照或网络/费用审计。内容结论保持初步可读/分幕展开疑问/情绪语义未建立；下一步仅准备[分幕承接离线提示候选](SCENE-CONTINUITY-PROMPT.md)。

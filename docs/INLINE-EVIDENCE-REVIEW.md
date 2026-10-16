# 直接引文格式：独立离线比较

状态：**offline_comparison_only**。本轮只比较格式和校验机制，没有构造真实请求、模型生成、Store写入或新费用；不能把虚构脚本通过说成DeepSeek更遵守协议。现有50个生产pin保持匹配，旧失败、四笔unknown hold和任何已批准profile不变。

## 设计判断

值得继续在独立离线运行器里验证直接引文，但**尚不能替换真实入口**。它免去模型填写数字引用，仍需要精确引文、正确字段、显式情绪分支和合法数值。复制引文的负担和长度限制没有消失；减少一个结构性错误来源不等于总体成功率或梦质量改善。

这也不诊断上次被丢弃的响应：具体坏引用仍未知，不能声称其就是编号从1开始或哪一字段出错。

| 项目 | 当前紧凑格式 | 离线直接引文格式 |
| --- | --- | --- |
| 证据表达 | 唯一evidence表，模型写links数字索引 | basis各字段直接写本幕精确引文或null |
| 目标依据 | null或两个索引 | null或恰好两个引文字符串，顺序仍为目标、结果 |
| 情绪 | unchanged，或estimated＋两个delta＋索引 | unchanged，或estimated＋两个delta＋excerpt字符串 |
| 内部共享 | 模型重用表项编号 | 程序仅为新格式的已提供文本分配/复用内部编号 |
| 保留要求 | 数值、当前事件、明确分支、依据、来源身份 | 相同；不补引文、不自动纠正数字、不把estimated变unchanged |
| 成本边界 | 400输出token和1200 JSON bytes各自受控 | 本轮仅检验同一1200-byte边界；实际token未测，未来也不得提高原400-token上限 |

独立示例（完全虚构，非真实生成输出）：

```json
{
  "event": "梦里的人看见门开了，松了一口气。",
  "appraisal": {"goalEffect": 0, "control": 0.5, "uncertainty": 0.5},
  "basis": {"goal": null, "control": null, "uncertainty": null},
  "affect": {
    "kind": "estimated",
    "delta": {"valence": 0.1, "arousal": -0.1},
    "excerpt": "松了一口气"
  }
}
```

0.5仍仅为无control/uncertainty依据时的兼容占位；不能解读为测得的中等可控性。estimated即使两个delta都零仍须有引文；unchanged是显式零声明，不能捎带delta或依据。允许普通、安静、无目标影响、无启示与多种情绪解释，不凭格式替用户决定情绪意义。

## 比较的实际范围

模块位于 `test-support/inline-evidence-review.js`，不在生产依赖内，身份 `offline-inline-evidence-review-v1`；真实selector与账本均拒绝该身份。仅接受显式fictional、scripted、no-egress包装；校验有界JSON、初始情绪、封闭字段后才转换。程序构造内部表不改变event、数值、分支或任何绑定引文。旧无效compact输入先被原校验器拒绝，不能借比较函数修复旧响应。

比较使用已存在的8个合法独立虚构contrast，加1个专门标记的共享长引文字节边界。另两个原有无效contrast仍被拒绝。对照同时计量原始提供的compact bytes、去除合法未用引文后的canonical compact bytes及inline bytes，避免把旧表中未用文本的删除算作直接引文的节省。旧审计与新程序审计分开列出，不把它们冒充同一来源记录。

- 8个现有样例：意义承载字段完全一致，inline在231–331 bytes，相对canonical compact减少14–16 bytes。这里是序列化JSON字节，不是token节省、计费承诺或模型输出统计。
- 共享长引文的合成边界：compact603 bytes，inline1359 bytes，增加756 bytes；直接格式依然被1200-byte上限拒绝，不截断事件或依据、不提高上限。
- “无关依据”和“方向冲突”等原有语义反例仍可通过字面检验。这正说明格式等价不是语义支持，不能把引文出现当作判断正确或情绪幅度验证。

## 验证与下一步

固定命令 `node scripts/check-inline-evidence-review.mjs` 只读公共虚构fixture，输出9组无正文汇总，守卫Key和native fetch，不打开Store。新增32项检查覆盖原反例、数值/分支保持、goal边界、未用与共享引文、64 Unicode codepoints、JSON转义、1200/1201 bytes、输入身份、getter/别名与真实入口拒绝。

新增检查联合旧引用12项和当前入口31项合计75/75；临时Linux CRLF副本新增32/32。没有新全仓或Windows实机测试，原454/454仍属先前阶段；没有实际模型请求/真实token统计/供应商账单/梦质量验收。原始汇总与源文件哈希见 `validation/inline-evidence-validation.json`。

下一步仅在独立模拟运行器里验证新格式的两幕、醒来、持久化、撤回和恢复身份，再考虑是否有足够理由准备新的付费协议。尚无新live builder、paid profile或Asteria适配，不复用旧额度，不要求用户再次输Key。

本轮只有项目自有MIT独立代码和公开虚构反例，不复制第三方实现或私有Continuity原文，不保存用户被拒正文、聊天、梦簿、配置、运行编号、指纹或密钥。既有Store/journal边界仍不涵盖外部备份、终端副本、供应商留存或物理擦除。

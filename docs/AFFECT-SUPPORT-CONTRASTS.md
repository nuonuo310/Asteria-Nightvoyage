# 情绪依据与分幕变化：独立虚构离线对照

承接 `COUPLED-QUALITY-REVIEW.md` 的两个concern，本阶段新增10条独立编写的虚构scene对照与3组分幕阅读例。交付可执行的离线fixture审查器，**不是新生成协议、语义分类器、自动质量评分或真实复测**。未复制用户原梦/醒来记录/被丢弃响应或私有研究，素材由本项目按MIT独立编写。

## 先明确这组对照能说明什么

`fixtures/affect-support-contrasts.json` 每条有raw scene、预期字面合同结果、作者预写的质性观察。`src/affect-support-contrast.js` 仅调用现有coupled规范器核对结构、数值和字面引文；对照 expectedGate，输出短ID、固定检查码与有明确来源的观察标签，不返回事件/引文/评语正文。

作者标签**不会参与规范器的接受/拒绝，也不被程序重新推断**。把一条作者标签有意换成另一个合法标签，程序仍给同样的字面结果，并继续标记 annotationsVerifiedSemantically=false；测试专门验证这一点，避免把fixture注释冒充自动语义识别。通过的测试只证明合同与记录边界，没有验证注释就是客观标准答案，也没有证明用户那条真实梦的情绪合理。

| 对照类别 | 作者观察的含义 | 实际自动检查能做什么 |
| --- | --- | --- |
| 同事件、同引文，正/负valence两种估计 | 意义未表明时，多种情绪读法皆可能；方向并不由substring唯一决定 | 两条都可字面通过；不会自动选择其中一条或给语义加分 |
| 文本直接写出舒缓/警觉 | 提供较直接的质性联系，仍不是唯一解释或精确数值标尺 | 验证所引用字符确实出现，数值与字段合法 |
| 同事件选择物件引文或与情绪相关的引文 | 人工可讨论选择是否抓住写出的触发关系；不能说某物件永远无关 | 只要引文出现，两种选择都可通过 |
| 作者指出方向冲突 | 提醒复核文本与数值读法，不是心理学定律、真实情绪真值或新拒绝规则 | 现有结构/字面门仍可接受，冲突标签仅来自fixture作者 |
| 显式unchanged | 不需要emotion quote，不能用它替缺依据的非零变化补零 | 原成对编码规则照常执行，不从文字平淡自动推断分支 |
| estimated索引缺失 / 引文不在事件中 | 先处理合同失败，不能用人工觉得合理绕过缺字段或字面守卫 | 两项依原协议拒绝，不修复、不补发、不生成新标签 |

所有给出delta的例子都把“精确幅度支持”记为not_established。即使有直接情绪表达，也不以它证明某个小数值的真实性。没有统一恐惧/喜悦阈值，没有要求一件事只能引起一种情绪，也没有让梦必须带心理解释句。

## 分幕对照不做排名

另有3组独立短幕：确认已有变化、普通感官细微推进、保留联系的梦式转变。标签分别是limited_confirmation / ordinary_subtle_progress / transformed_with_link，均带 fixture_author_annotation / isAutomaticJudgment=false / qualityRank=null。

它们帮助复核“是否有新增体验”这一问题，不计算动作数、名词数或新奇程度，不宣布更怪就更好。重复/确认可以是有意义的梦；普通内容与突变都可成立，也不要求每幕推进现实主义情节。这里只保留可讨论的阅读差别，没有从3例推导生产生成门槛。

## 接口与不变项

安全复现，无需Key：

```powershell
Set-Location "$env:USERPROFILE\Desktop\Asteria-Nightvoyage"
node scripts/check-affect-support-contrasts.mjs
```

脚本只读固定公开fixture，设原生fetch与Key属性访问拒绝探针，输出聚合；没有CLI素材路径override、模型provider、账本、Store实例或运行正文保存。helper只接收显式fictional/no-egress/scripted标记与有界闭合外层schema，固定enum与短ID限制输出注释；这些标记不是对任意外部文本真伪的认证。固定脚本不会扫描用户数据。

未改任何现有live传递依赖源码、prompt、profile、价格/到期或额度；当前coupled试跑的25个pin全部仍匹配。新helper没有被生产入口导入，offline版本不能用作gated client选择器。3笔旧unknown与已完成梦完全未打开/改写。原梦质量仍按既有复核保留，Asteria仍待对接。

## 结果与局限

Linux LF定向 **59/59**（新增18＋既有coupled review19＋预算核心22），临时Linux CRLF只跑新增 **18/18**，均0失败/跳过。没有重跑全套300项，不把它算成本轮结果；无原生Windows新验证。固定脚本10条scene的预期字面结果全部一致：8接受、2拒绝；3组transition标签只作作者观察。原始日志、脚本输出及摘要哈希见 `validation/affect-support-*`。没有失败后放宽校验，首次即通过上述范围。

新测试除逐条预期外，还覆盖相同事件相反估计、字面通过但作者质疑、标签变更不改变校验、分幕不排名、真实/未标记/外发输入拒绝、有界注释/重复ID拒绝、聚合无正文、无凭据/网络/运行写入、原live pin不变。它们证明边界和机制，不是复述作者标签来宣称语义正确。

本阶段的设计判断是：**保留当前字面门作为确定性合同，另外记录作者的质性疑问；暂不把语义评价塞进生产门控。** 若下一阶段想改变模型评价结构，应先提出独立版本合同，清楚表达“已声明的梦中主观估计”和“不确定的依据支持”，评审再决定实现；不能因这组注释就强制归零、自动修复、要求情绪词、增开模型评分调用或重抽真实样本。

这些对照既没有证明生成质量提升，也没有验证真实模型遵循率、tokens/费用或真正主观情绪。qualityAccepted=false / semanticClassifier=false / semanticSupport=not_automatically_assessed保持。无真实材料、Key、模型请求、用户Store、第三方实现/新依赖或跨仓库修改。存储/撤回边界没有新增旁路。

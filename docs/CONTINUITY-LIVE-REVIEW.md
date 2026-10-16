# 分幕候选第一次真实尝试：第一幕引用校验拒绝

状态：**stopped_after_first_scene_rejection**。工作台已明确批准独立3 CNY上限、固定虚构sparse-context外发、最多一个新梦/三调用及旧三hold保留；随后用户报告Windows执行结果。本页是独立机制摘要，不复制终端、聊天、生成正文、用户运行编号、指纹或私人配置。

## 已报告结果

- 仅1次调用，第一幕`compact_appraisal_invalid / invalid_compact_reference`；0幕提交，无原梦、醒来、余韵或联想发布。
- 当前尝试账项unknown，保留2203200 micro-CNY（2.2032 CNY）。这里是保守hold，usage未结算，**实际供应商费用未知**，不能把input/output=0理解成免费。
- 旧三笔unknown仍为6609600 micro-CNY；四笔unknown合计8812800 micro-CNY。本次preflight为`unsettled_attempt_requires_review`，source/fixture pins匹配，Key未被预检读取。
- 预检报告总28次调用/12个登记run，held-or-spent合计8858034 micro-CNY；此合计混合已结算估计与unknown保守占额，不是供应商账单。
- PowerShell末尾的“本次未完成”是已设计的停止，不是又发起了一次调用。没有给用户重试、恢复、清算或新额度指令。

以上为用户侧报告，项目环境未直接打开用户Store、核对供应商账单或审计整台Windows的网络/环境清理。本次未获得新Windows全套测试结果，不从之前Linux证据推断实机通过。

## 能确定和不能确定的事

代码中`invalid_compact_reference`对应引用解码：引用不是非负安全整数、超出evidence表长度，或goal不是恰好两个引用的数组等。coupled显式affect分支先校验形状，因此负affect引用会落到另一个shape错误；非负但越界仍可触发本次引用错误。未用合法引文的裁剪仅在整个表与引用先通过后发生，不能修复非法引用。

**这些只是可触发同一码的路径，不能认定本次具体错误属于其中哪一种。** 本次被拒正文未保存，不能逆推出原响应、复原证据表、断言模型用了1-based索引，或把离线虚构反例说成捕获到了真实问题字段。

候选只在第二幕增加提示。离线同一固定虚构输入的第一幕builder比较确认：candidate与旧coupled的实际body完全相同，第一幕没有这段新增提示；协议/批准身份依旧不同。由于第二幕未到达，这次**尚未评估分幕提示的遵循、连续体验或梦境质量**，既不能说它改善了，也不能说它导致本次引用错误。

## 本轮离线工作

新增 `scripts/check-continuity-references.mjs`：11个项目自有虚构反例，覆盖负数/字符串/小数/越界、goal结构、affect越界与分支边界，以及合法零引用/合法未用引文。输出只有固定类别和汇总，守卫真实fetch与Key，不打开Store、不保存正文、不调用模型、不变更生产协议或任何旧profile/pin。

新增12项检查与原候选预算27项合计 **39/39**；没有因本轮脚本/文档变更重复全仓。原454/454、CRLF60/60仍是前一阶段证据，不冒充新一轮实机或生成质量证据。新增证据与哈希见 `validation/continuity-reference-review.json`。

下一步仅做离线协议编码/模型负担的比较设计，审查如何减少引用出错而不伪造依据或放宽语义边界；不立刻再申请付费诊断。不能自动把字符串转索引、将1-based减一、截断越界、补引文或把估计情绪归零来发布梦。任何新协议必须独立命名、保留原诊断与四笔hold，完成模拟证据后再另行决定是否值得付费。

本轮代码/反例为项目自有MIT独立实现，没有第三方实现复制、私有Continuity原文或用户梦簿上传。Asteria仍未接入。已有单Store/journal边界不扩展到终端副本、备份、供应商留存或物理擦除。

# 分幕承接提示词：仅离线请求候选

版本：offline-scene-continuity-prompt-v1。实现 src/scene-continuity-prompt.js，只构造 baseline/candidate 请求用于审阅，**没有 provider、模拟生成、Store、付费入口或已启用的新协议**。旧 coupled prompt/core/profile 的 25 个源码 pin 不变，不重签旧批准，不续跑旧样本。

问题范围来自同一已保存单例的再次阅读：初步可读，后幕新增体验有限，情绪方向/幅度的语义疑问仍在。用户在 Windows 成功显示保存正文和分离视图，说明新 reader 在该本地运行中可用；**没有增加样本数或完成整体质量验收**。无正文汇总见 validation/user-local-content-reader-windows.json。未将梦文、引文、实际编号/指纹或终端聊天原样放入公开仓库，也未读取用户 Store。

## 唯一候选

仅当 stage=scene、index=1 时，在现有 system prompt 末尾增加下面三句。首幕和醒来请求的 body 完全保持原样；候选 wrapper 使用不同的 offline protocolVersion 标签，不能把它当成已获准的当前入口。

> Write the next moment being lived in this dream. An ordinary action, perception, or lingering attention may carry the scene.
>
> A quiet return or confirmation is allowed. If a scene adds only a recap of what is already established, consider a lived moment within the same situation.
>
> No quota for novelty, new objects, location changes, conflict, insight, emotional explanations, or positive endings. Keep all existing source, perspective, affect-evidence, schema, and output limits.

设计意图：让后幕关注一个被经历着的时刻，可以只是动作、感知或停留；允许普通延续、安静返回和确认。避免将“发生了什么”换句式复述当成唯一生成策略，但不增加最低新奇度、物件数、戏剧性或每幕必须推进的验收门槛。它是柔性生成建议，不是确定性评分规则；不会自动拒绝重复、删去非零情绪、加解释段或重抽样。

不改 affect estimated/unchanged 选择、引文索引、归一化/裁剪规则、JSON shape、400 输出 token 上限、1200 响应 JSON byte 安全上限、醒来逐字摘录或账本。仅 system prose 有增量，用户素材、前幕事件、来源标记和 before 数值保持逐项一致。

## 既有虚构对照的人工审阅

这些对照来自先前自有 fixtures/affect-support-contrasts.json，**早于候选、由人手写，绝不是候选的生成结果或效果证据**。

| 对照 | 本轮对候选边界的阅读 | 未建立的结论 |
| --- | --- | --- |
| confirm-only：再次确认既有状态 | 候选明确允许确认；可讨论体验是否足够，但不能自动判失败 | 不声称每次确认都多余，也不自动接受每次重复 |
| ordinary-subtle：原场景中的轻微感官联系 | 可在原有事物/动作中展开，不需要新增角色、物件或冲突 | 不声称必须出现一个新的感官细节才合格 |
| dream-transformation：保留联系的梦式转变 | 仍允许不现实转变 | 不把它排在普通梦之上，不设变形配额 |

脚本仅保留此前作者注释、isAutomaticJudgment=false 和 qualityRank=null；它不计算这些叙事的语义相似度或质量。事件—情绪方向仍可以多义，精确幅度未验证；本轮不另写一套情绪提示。

## 请求结构检查与边界

compareSceneContinuityRequest 接收闭合 snapshot/scenes/stage/index 输入，只接受虚构、所有 source grant.modelEgress=false 的材料，首幕 index0/后幕 index1/两幕后 wake index2。已有 checkpoint 规范器检查结构/数值/字面依据和前后链；不提供外部存储来源认证，也不能证明结构一致的故事没有被换写。受管理内容绑定仍需要已有 Store/父内容指纹路径。

首轮新测试 9 通过/1 失败，原因是测试错误地期待独立请求规范器拒绝任意改写后的结构一致无依据场景。已纠正保证范围：数值/协议/audit 不一致必须拒绝；另一段完全自洽的虚构正文可被离线接纳，但未认证、未获运行授权。新增对照明确保留这条限制，没有放宽任何现有 normalizer。

字节检查按实际 JSON.stringify(request.body) 的 UTF-8 长度计算，候选不提高 65536 请求 byte 上限，超界如实标记 candidateFits=false；没有 token 数估算或实际模型 token 结论。固定样例首幕 4380→4380、第二幕 5240→5723（+483 bytes）、醒来 4220→4220。此输入下未超界，不代表任意输入均可发出，也不代表费用批准。

## 可复现验证

```sh
node --test test/scene-continuity-prompt.test.js
node scripts/check-scene-continuity-prompt.mjs
```

最终 Linux Node v24.19.0：12 项新增；候选+原离线对照+coupled budget 定向 52/52；Linux CRLF 临时副本候选 12/12。没有全套重跑、新 Windows 运行或模型质量试验。脚本仅构造 3 份请求，假生成 0、真实调用 0、key 读取 0、Store 打开 0，打印提示增量/字节/作者注释摘要，不输出素材、前幕或原梦正文。证据见 docs/validation/scene-continuity-*。

## 阶段裁决

候选的文本与结构边界已准备，可以审阅；modelComplianceImproved=not_assessed、qualityAssessed=false。**离线检查不证明更自然、少重复或保留安静梦的实际发生率**。当前不接入实时生成，不新建 allowance/收费 CLI，也不让完成文档或手写脚本代替真实效果验收。

未来若评审同意进入真实比较，须先单独准备可审计的候选协议身份/持久化/失败边界、明确虚构素材与调用/费用上限，再向用户确认新的具体费用与外发；沿用旧完成结果作基线时不能冒充同条件随机实验。旧 unknown 原样保留，不自动修复/退款/重试。Asteria 仍待对接。

提示词、比较器和对照是项目 MIT 自有独立表述/实现，未复制私有原文、第三方实现或真实梦簿，没有新依赖或跨仓库变更。

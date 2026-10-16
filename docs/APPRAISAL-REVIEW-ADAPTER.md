# 独立复核 C 阶段：显式本地适配器合同

合同版本 `dream-appraisal-review-adapter-v1`，实现位于 src/appraisal-review-adapter.js。`LocalFileAppraisalReviewAdapter(store, reviewer)` 使用现有、已经锁定的文件 Store；不会自己打开另一份存储，也不负责关闭调用者的 Store。底层保存/幂等/修订/撤回边界见[B 阶段](APPRAISAL-REVIEW-STORAGE.md)。

这是可用的本地复核适配器，**不是 Asteria 已接通或兼容的声明**。未来 Asteria 适配器应实现下表同一方法/结构，并在可信接收端提供 actor 与获准 parent；目前不存在远端 endpoint、账号鉴权、实时状态或向 Asteria 写入能力。输入实际素材仍限虚构；生成事件及评审均不是现实事实。

## 明确的方法与返回

| 方法 | 闭合输入 | 返回 |
| --- | --- | --- |
| capabilities() | 无输入 | contractVersion、adapter=local_file、asteriaAdapter=pending、操作清单、automaticReview=false、modelCalls=false、actorIdentity=trusted_local_assertion |
| createReview(input) | {dreamId, request}；request 使用 B 的固定 id/requestId/sceneIndex/assessment/supersedesReviewId | {contractVersion, review}；成功为受管理记录，已删 receipt 的重放可为 null；权限/冲突/输入错误抛固定错误码 |
| readReview(input) | {reviewId} | {contractVersion, review}；缺失/已删/来源撤回为 null |
| listReviews(input) | {dreamId} | {contractVersion, reviews}；不可访问为 []；保留全部可读意见和版本，不选最新作真值 |
| readDreamReviewBundle(input) | {dreamId} | 可读时为带来源/非事实 envelope 的 {dream, appraisalView, reviews, ...}；不可访问为 null |
| deleteReview(input) | {reviewId} | {contractVersion, reviewId, status:deleted/unavailable}；重复删除无新增条目 |

所有操作显式发起；请求不能增加模型/凭据/费用/工具/actor 覆盖参数。输入中的未知字段和危险 id 拒绝。reviewer 在适配器创建时由可信本地调用者提供，不从每条意见中伪造，也不是远程认证系统。每个返回为独立副本，每次读取重查 B 的可见性，没有正文缓存。

readDreamReviewBundle 的 dream 是原梦 envelope/scenes/policy，移除内部 wake/residue 嵌套；appraisalView 是现有程序读取视图；reviews 是独立评审记录数组。醒来记录和余韵继续由现有 engine.result 独立返回，此 bundle 不重新估计它们。不把三类内容拼成一段待猜测的自然语言，不以“compatible”覆盖原始数值或变成现实结论。

deleteReview 只查受管理复核索引，不能通过填入 dream id 删除原梦。删除单条意见不会删除直接依赖原梦的独立修订；父梦删除/来源撤回仍清除全部，任何 read/list/bundle/replay 都不得复现正文。普通梦簿的删除/来源撤回仍使用已有接口，新适配器不新增批量删除或来源再授权入口。

此合同不创建新的生成任务：没有 start/execute/resume 或异步评审 job，所以没有新的模型取消/重试/调用预算状态机。生成控制口仍是既有夜航流程。也没有人格、真实记忆、Mind、任务完成、工具执行或自动评审方法。

## 完整虚构端到端样例

```sh
node scripts/check-appraisal-review-adapter.mjs
```

脚本是可直接运行的完整示例，不需要 key 或更改配置：在仓库外新建临时 Store，使用公开虚构素材和本地模拟器完成两幕/醒来；绑定虚构本地 reviewer；createReview → 重复请求 → readDreamReviewBundle → 关闭/重开 → readReview → 来源撤回 → read/list/bundle 全部不交付正文，最后清理自己创建的临时目录。

脚本仅输出机制摘要，不打印梦、引文、意见正文或真实运行配置。其 3 次生成均为本地假模型；native fetch 和凭据读取探针为 0。不会打开用户先前的试跑目录、读取私人材料、续跑付费试验或修改任何 allowance。库用法可直接参考该脚本中创建适配器和方法调用的部分。

## 验证与剩余范围

Linux Node v24.19.0：C 新增 8 项，和 A/B/现有 appraisal view 定向共 60/60；Linux CRLF 临时副本 C 8/8。B 已有全套 362/362 是上一阶段证据，此阶段未重跑全套，也不是 Windows 新实测。日志和摘要位于 docs/validation/appraisal-review-adapter-*。

覆盖独立输出与字段归属、跨实例/重开去重、未知字段/actor/model 越权拒绝、仅删意见而不能删梦、撤回/原梦删除后所有交付路径失效、返回引用不相互污染、调用者 Store 生命周期和默认无 Asteria/模型能力。现有 25 live source pins 保持不变。

A/B/C 的本地复核机制现已实现，但没有新增人工梦境质量验收、语义正确性证明或真实模型评审。这条支线不替代后续对梦本身的体验判断。下一次真实生成仍需另行具体预算/外发确认；现有已耗尽/未决试跑不重签、不续跑、不释放预留。首版本地存储/外部副本/备份边界沿用 B。

项目 MIT 自有实现，未复制第三方代码、私有研究或真实梦簿正文；没有新依赖、前端或跨仓库修改。

后续补充：用户报告此固定脚本在 Windows Node v24.19.0 完成，假生成 3 次、真实请求/密钥读取 0，分离输出/原梦账项不变/重开去重/撤回屏蔽通过；独立无正文摘要见 validation/user-local-review-adapter-windows.json。不是全套 Windows 测试或实际梦簿阅读。新[内容查看入口](LOCAL-CONTENT-REVIEW.md)用于下一步本地阅读，不自动创建复核意见。

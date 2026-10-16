# 独立复核 A 阶段：纯内存规范器与投影

已实现 `src/appraisal-review-memory.js`，对应[实施前合同](APPRAISAL-REVIEW-CONTRACT.md)的 A 阶段。它接收独立虚构设计数据，返回带 illustrativeOnly=true / runtimeSupported=false 的草稿；**不是已接入梦簿的复核接口**。没有 createReview/readReview/listReviews、CLI 保存操作或 Asteria 适配器。

## 已实现行为

- buildAppraisalReviewDraft(context, request)：从显式虚构 parent 和适配器 reviewer 元数据构造草稿。调用者意见只能提交固定 assessment、身份、幕编号和空 supersedes；不能覆盖程序设置的来源/非事实身份/父版本/checkpoint 标签。
- projectAppraisalReviewDraft(context, draft)：重新核对可见性、完整场景链、来源版本、父身份及场景指纹；匹配才返回独立副本。拒绝篡改和附加字段；虚构撤回/删除状态返回 null。
- 只支持 current coupled-affect-quotes-v1、1–2 幕、已完成的虚构父记录。所有场景均重新走现有 canonical checkpoint 规范器；即使复核第 0 幕，也不忽略损坏的后续幕。
- 估计方向分别记录相容/难判断/表面冲突/未复核；幅度仅 not_established。unchanged 的相关性/方向/幅度为 not_applicable；estimated-zero 仍按 estimated 处理，不能假装没有估计。
- 备注是最多 600 Unicode code points 的文本数据，拒绝非法代理项/控制字符。闭合 schema、safeId、来源唯一性、有限数、数据深度/大小限制；拒绝 getter、非 JSON 对象和隐藏字段。错误只返回固定代码，不带输入正文。
- 输出无可变引用别名，不写原梦、delta/after 或现有 appraisal view。冲突意见不会触发归零、修复、额外模型调用或现实动作。

context 是 `fictional_appraisal_review_context` 的设计专用输入：parent、reviewer、withdrawnSourceIds、deletedDreamIds。parent 包含 dreamId/runId/status/protocolVersion/origin/materialKind/isRealityFact/sourceRefs/initialAffect/scenes。**这些信息由测试调用者构造，不能证明真实授权、来源存续或受管理 Store 身份。** 现在不能把用户梦簿或原样 Store 状态传进来并声称已经接入。

request 固定为 id/requestId/sceneIndex/assessment/supersedesReviewId。A 阶段只允许 supersedesReviewId=null。同样输入确定性重建同样草稿；同 requestId 改意见会得到不同草稿，**没有 durable 幂等/冲突登记或修订链**。草稿不是签名或不可伪造的评审收据；projection 的内容对照不认证评审者或语义真值。

## 可复现检查

```sh
node --test test/appraisal-review-memory.test.js
node scripts/check-appraisal-review-memory.mjs
```

固定脚本只读取公开虚构 fixture 和说明样例，确认相同 record、输入不变、模拟撤回屏蔽和既有 25 live source pins 未变。执行 helper 时凭据读取、native fetch、常用 fs/fs.promises 写入入口均设置拒绝探针；报告 0 次调用/读取/运行写入。它不输出事件、引文或评审备注，也不打开运行 Store。

本轮 Linux Node v24.19.0：新增 16 项；与离线对照、coupled budget、核心 review 共同运行 59/59，通过；现有 appraisal view 回归 7/7，通过。另将独立临时副本 JS/MJS/JSON 改为 CRLF，新增测试 16/16，通过。**CRLF 是 Linux 下换行兼容验证，不是新的 Windows 实测**。未重跑全套；原始日志与摘要在 docs/validation/appraisal-review-memory-*。

## 尚未实现与下一阶段

B 阶段需要由同一受管理 Store 提供可信 parent/reviewer/来源撤回状态，设计独立版本集合，做原子保存、幂等冲突、同评审者修订、父删除/来源撤回覆盖、失败/进程退出/重开不复现测试。A 阶段的 null 只证明调用者给出撤回状态时的内存行为，**不证明磁盘清除、缓存清除或重启恢复**。不得将草稿直接塞进现有 entries。

C 阶段才暴露显式本地适配器方法；对接 Asteria 仍待对接。若将来 core pin 改动，不能重签旧批准或延长旧期限；旧历史可读性仍需验证。此次无现有 core/prompt/profile 变更、付费入口、新 allowance 或账项调整；三笔 unknown 原样保留。

全部代码、文档与例子是项目自有 MIT 独立实现；只复用本项目的 canonical 规范器，未复制第三方或私有 Continuity 原文。机制测试不证明语义支持、真实情绪或梦境质量，未做新的真实模型试跑。

后续状态：B 的[受管理持久化与清除机制](APPRAISAL-REVIEW-STORAGE.md)现已另行实现。上述 A helper 仍是 illustrative 设计数据；只有 B 从同一 Store 重建父内容、检查日志并原子保存的路径，才生成受管理复核条目。共享 JSON guard 增加显式导出供 B 使用，不改变 A 的草稿语义。

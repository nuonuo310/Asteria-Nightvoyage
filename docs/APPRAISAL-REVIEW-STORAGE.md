# 独立复核 B 阶段：同 Store 持久化与生命周期

B 已实现 `AppraisalReviewStore`（src/appraisal-review-store.js），接收**已经持有 owner lock 的同一个 Store**和本地适配器提供的 reviewer。它不会自己开第二个 Store，不读取凭据、调用模型或改账本。当前只支持可读、已完成、coupled-affect-quotes-v1 的虚构父梦。Asteria 仍待对接。

## 存储裁决

复用 state.entries 的通用来源清除/整梦删除路径，增加独立 origin=dream_appraisal_review、reviewVersion=dream-appraisal-review-v1 的受管理条目；它不是把 A 阶段样例原样塞进 entries。实际记录由受管理父梦和 run 重建，增加通用 envelope 的 runId，校验父梦/run/源版本和全幕 canonical checkpoint 链；没有 illustrativeOnly/runtimeSupported 草稿包装。原 dream、wake、delta/after、appraisal view 保持原值。

另增 state.appraisalReviewIndex={version:1,requests:{...}}，**只存无正文去重元数据**：请求指纹、条目 hash、条目 id、父梦 id、run id。评审备注/意见只在通用条目中保存，账本不增加这些正文；没有 sidecar 文件、独立正文缓存或索引副本。复核条目和索引一次 Store.save 原子提交。为限制本地首版大小，每个 Store 最多登记 100 个复核请求；删除后保留无正文身份，也占此上限，不自动回收或重用。

选择通用条目意味着现有 Nightvoyage.read/list 可看到独立来源类型的复核记录/元数据；result 的 dream/wake/residue 与 appraisal view 不混入意见。cue recall 仅搜索 origin=dream 的原幕，不搜索复核备注。复核不是 recollection/imagined_continuation，不能通过 append 冒充。新代码不修改已有 Store/core/prompt/profile，旧 25 live source pins 保持匹配；这不是扩充旧调用额度。

## 内部接口与权限

- new AppraisalReviewStore(store, reviewer)：绑定本地 actorId/kind，不从模型或每次意见请求读取评审者身份；返回数据为独立副本。reviewer 是可信本地适配器的声明，不是远程用户身份认证、签名或“人工已验收”的证据。
- create(dreamId, request)：请求固定 id/requestId/sceneIndex/assessment/supersedesReviewId。来源、父身份、输入素材身份与非事实字段从受管理父内容读取，复用 A 的闭合 schema 和数据界限。缺失/撤回/已删父梦拒绝；场景链或绑定损坏拒绝。
- read(reviewId) / list(dreamId)：每次重查父梦、来源、删除日志、checkpoint 和记录 hash，不使用正文缓存。hash 是本地一致性校验，不是抗本地磁盘篡改的认证系统。已删/不可访问返回 null 或空列表，不能仅凭旧 receipt 重放正文。

这是 B 的低层存储接口。C 才将它整理为显式本地适配器合同；当前未增加 Nightvoyage.createReview 等便捷方法、复核 CLI、自动评审或每轮注入。

## 幂等、修订与删除

相同 requestId 和完整绑定内容返回同一条；内容、actor、parent 或 entry id 改动则冲突。不同请求不能覆盖既有 id，已删除 id 也不能借新请求复活。重复执行不新增任何生成请求或费用。

修订必须引用现存可读的同父场景版本、同评审者记录，另建不可变条目。不同评审者并列，不自动选择最新为真。supersedes 是修订引用，**不是新的来源授权或父子所有权**：每一条都直接依赖原梦。单独删除一条意见只清除该条，其独立修订可保留这个无正文旧编号；原梦删除或任一相关来源撤回则清除全部意见、修订和备注。这与“所有版本永不删除”不同，删除/撤回优先。

同一 Store 的创建带重入保护；提交前再次检查父内容/来源和修订依据，提交后再次读取，避免撤回或删除发生在测试切点时交付迟到正文。操作同步且只做一次原子文件保存，不新增模型阶段，因此不引入生成取消/重试或新预算规则。

## 失败与边界

- 初次写入失败：不返回成功，内存记录/索引回滚，Store 标为不可用；重开按实际已提交文件判断。提交成功后发生的歧义失败也不假装退款或补发；重开相同请求只能获得已提交条目或空结果。
- 真实进程在提交前后退出：已有 owner lock 恢复规则生效；条目和 receipt 不分裂。已提交后没交付，重放仍只有一条。
- 来源撤回/原梦删除：复用现有持久 journal。日志已提交、正文清除前退出，重开重新清除；snapshot.tmp 残留被移除。直接通过普通 Store/Nightvoyage 操作也覆盖这些条目，不依赖新类特有钩子。
- 若日志本身无法持久化，沿用既有 storage_io_failure/不可用并需修复后重试规则；不能声称磁盘已完成撤回。终端里已经交付的副本、外部备份、编辑器历史、供应商保存与物理安全擦除不在本地受管理文件保证内。首版不创建备份。

只测试仓库外临时目录与独立虚构数据；没有访问用户的真实 Store 或清除用户内容。固定模拟器有 3 次假生成调用，native 网络/凭据读取为零；三笔 independently fabricated unknown 保留 6,609,600 micro-CNY，复核和撤回不更改这些账项。它们不是新一次实际余额核对。

## 验证

```sh
node --test test/appraisal-review-store.test.js
node scripts/check-appraisal-review-store.mjs
```

Linux Node v24.19.0 全套 362/362（含本轮前 28 项新增测试）；加入固定脚本入口测试后，最终 B 定向 29/29。之后 Linux CRLF 临时副本 A+B 共 45/45。没有将全套记录改写成 363，也没有新增 Windows 实测。原始日志、脚本摘要和文件 hash 位于 docs/validation/appraisal-review-store-*。

测试涵盖新建/重放/冲突/修订/独立读取、原梦和账项不变、输入/返回引用变异、失败关闭、真实子进程退出、直接基类撤回、原梦删除、日志中断恢复、临时文件清除、迟到提交屏蔽、重入与容量。它们不证明评审意见的语义正确、真实情感或梦境质量。代码为本项目 MIT 独立实现，只复用自有 Store 和 canonical 规范器，未复制第三方实现或私有原文。

下一步 C：将低层能力封装为明确本地适配器输入/输出与调用边界，默认不自动复核；继续保留来源身份，仍不修改 Asteria 的记忆、人格、Mind 或任务状态。

后续状态：C 的[本地适配器封装](APPRAISAL-REVIEW-ADAPTER.md)已完成，提供显式方法、独立输出 bundle 和仅限复核的删除操作；不新增 Nightvoyage 生成方法或 Asteria 连接。上述 B 证据仍按原测试时点保留。

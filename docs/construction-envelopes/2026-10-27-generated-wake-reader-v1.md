# NV-GENERATED-WAKE-READER-01 · 离线梦簿阅读接线 v1

状态：一次有界离线施工授权；不批准新模型调用、真实Store读取或合并。

## Opening Gate
仓库 nuonuo310/Asteria-Nightvoyage；固定实现基线 #101@
40589d54838f542e470ed9d45c1f2500193b6eaa，tree eb454bda8274476caad1da606bf806e9900887af。
main 预期 249d38ab6eb65aeab3207771062b0e51b962bd4d；
#101 仍应为 Draft、未合并、head未漂移。
本包所在 docs/nightvoyage-generated-wake-reader-01 是权威文档分支，
实现从固定#101建立独立worktree/分支，不修改原#101工作区。
先回读适用AGENTS.md和 docs/v1-closure/V1-CLOSURE-PLAN.md。
Phase One已冻结，本轮不重开它的完成线。
已有同包任务时只读识别状态，禁止重复或并发启动；身份漂移回报总控。

## 产品裁定
刚醒心情是醒来时的一段虚构感受；持续余韵是后来仍留下的影响，两者不能改名互代。
当前 residue 仅模拟强度及时间衰减，没有真实互动驱动的情绪延续。
本轮只展示已有层次，不新增持续余韵状态机，不把数字写成“已安心/仍难过”。
未来真实回应影响余韵列入 later，不作为本轮blocker。

## DONE LINE
已有新版本只读投影可导出一个自包含中文静态HTML梦簿：
原梦两幕 → 醒来残片 → 刚醒心情（有记录才显示） → 后来回想（有记录才显示）。
技术信息放折叠详情，明确 residue 为模拟余韵强度，不以其替代心情。
用已有虚构fixture、假响应和独立临时Store完成端到端导出及截图检查，
退出时原状态字节不变；删除/撤回不交付关联正文；
交付一个stacked Draft PR和可本地打开的虚构HTML示例后结束。

## 实现范围
新增 scripts/generated-wake-story-html.mjs（纯渲染）、
scripts/generated-wake-story-demo.mjs（仅固定虚构演示/导出）、
test/generated-wake-story.test.js 和 docs/ 下说明/准确证据。
如需共享转义/样式可在scripts/新增小模块，不新增运行网络依赖。
src/、fixtures/、package.json、旧生成/账本/清单/许可、已有reader均不得修改。
不将新代码挪到scripts逃避pin：本轮是呈现层，不新增生成/状态业务逻辑。
若只读投影不够，停止说明，不绕过记录校验或改core。

阅读参考为 #95@ce0153fb43a19804af3f9163a843ddfdb4eb8404 中
scripts/dreambook-story-html.mjs（blob 14b45a2dbb1b43afc47bba99a5c336af87211764）。
此文件不在#101，不可假定可import；可以读取并复用其CSS作为新render的样式基准，
注明精确来源，不合并/cherry-pick整个#95，不把旧content-review视图伪装成新视图。
沿用现有阅读布局，不重做主题、不加资产/动画/新框架。

## 数据与输出
1. 使用 readGeneratedWakeView() 的受校验投影；原梦、残片、心情、回想逐字保留。
主线不放provider/模型名、裸ID、账本、原始状态、强度数字。
只放一处轻量“虚构演示”说明，不堆技术警告。
2. 省略或已删除心情：隐藏栏目；absent/uncertain：明确轻量文字，不编写心理叙事。
没有回想则不显示空卡；保留多个回想既有顺序，不伪造时间。
3. 模拟余韵放在原生details折叠技术区，标“模拟余韵强度（随时间衰减）”，
同时说明“不是持续心情记录，不随真实回应更新”。
不显示“余韵已消失所以心情好了”。时间按调用方传入的now固定，不添加后台更新。
4. 只读投影为null：显示不可读取状态，不输出旧正文/技术细节。
不得跳过readGeneratedWakeView直接遍历Store状态造HTML。
5. 所有叙事及详情动态值HTML转义；控制字符不可变为可执行内容。
无script、内联事件、远端字体/图片、外链请求、localStorage或网络。
折叠用原生details即可。历史导出只是离线副本，明确不承诺自动撤回已导出副本；
新导出须重新走来源/删除门禁，不创建后台清理或新权限。
6. demo只使用固定仓库fixture和假simulator，在新临时Store生成合成数据后close；
随后本地导出/读取不新增生成调用、不写状态。
允许单独虚构变体演示回想，但必须明确为测试输入，不能冒充真实用户后续。
不得提供用户任意Store路径入口或访问真实Store；不读取Key、浏览器/账号凭据。

## 验收
定向覆盖：present、absent、uncertain、缺席、已删心情、无/多条回想、
内容顺序、原文保持、模拟余韵标识/折叠、null不可读、HTML/控制字符惰性。
在临时Store核对导出前后state字节一致；删除/来源撤回后重新导出不含旧正文。
截图检查375px手机和桌面宽度：正文可读、无横向溢出、details可展开、
心情/残片层次清楚。优先用可用本地无网络浏览器；缺浏览器时报告视觉验收限制，
不把结构测试冒充截图通过，不为此安装联网依赖。
运行定向测试、相关generated-wake测试、新旧checker、完整npm.cmd test
（其他平台标明实际npm test）及git diff --check。
测试失败在允许范围连续修复；重复失败无信息增量则总控裁决。
证据保留命令、环境、次数、退出码及失败；合成数据可存repo，
用户Store、真实梦正文、Key与凭据绝不入库。

## NOT IN THIS VERSION / LATER
真实生成/付费、新协议、醒后互动改变余韵、情绪标签映射、
真实旧梦接入或回填、Asteria、自建网站部署、前端美化均不在本轮。
不为发现later问题增加slice，不扩大当前DONE LINE。
旧#98/#101继续Draft，不因本包授权合并。

## BLOCKING / STOP
正文被改写/混层、无来源的心情或回想、撤回后新导出泄漏、
读取写入真实Store、放宽校验/清单、改冻结src、
真实外部调用或新增费用均STOP。
非阻断排版微调记录later，不无限精修。

## 写入终点
允许新实现分支commit/push，创建一个stacked Draft PR，
base codex/nightvoyage-generated-wake-offline-01，固定上述#101 head。
保留本权威包原文与参考来源记录，不改其他PR或main。
交付静态HTML示例放本候选docs/examples/下，仅合成内容，
截图和日志按本项目证据约定保存，不提交临时Store。
回执为COMPLETE/BLOCKED/TOTAL CONTROL DECISION REQUIRED，
列HEAD/tree、base、文件范围、测试/视觉证据、限制、STOP触碰情况。
不ready、不merge、不部署、不自动续开下一包。DONE LINE达到即结束。

## R1 · 总控收尾裁决（2026-10-27）
本节是同包一次恢复授权，覆盖原文中本次恢复所涉的启动及验证要求；不是新任务。
仅恢复既有 Asteria-Nightvoyage-NV-GENERATED-WAKE-READER-01 worktree、
codex/nightvoyage-generated-wake-reader-01 分支及 Draft PR #103。
预期实现 HEAD 8b14c592c699671cccc15027e78d43179c4a7d07，
base 仍为 #101@40589d54838f542e470ed9d45c1f2500193b6eaa。
先确认无同包在跑；有任务运行则不重复启动。身份不符先只读报告，不覆盖或回退。

唯一修正：renderFeeling 的 absent 文案由“没有记下刚醒时的心情。”
改为“无（明确记为无）。”，不扩写成平静、没有特别心情或其他心理解释。
未记录/省略及已删除仍隐藏栏目，uncertain 与 present 保持原行为。
同步已有状态区分测试，明确 absent 显示新文案且不出现旧文案；
省略/已删除不出现 absent 文案，不改存储、状态或投影语义。

允许变更仅 scripts/generated-wake-story-html.mjs、
test/generated-wake-story.test.js、本权威包副本和对应说明/验证回执。
不改 src/fixtures/生成协议/清单/许可/账本，不访问真实 Store/Key/模型，
不新增示例剧情、布局功能、worktree、分支或 PR。
本次是短显示文字修正：运行 node --test test/generated-wake-story.test.js
与 git diff --check 即可；既有完整1958测试与截图仅保留为前轮证据，
不得冒称本轮重跑，也不要求再次完整测试或截图。
出现新的相关失败才按证据扩大必要验证。

在原分支提交、推送至既有 #103；回执包含精确 HEAD/tree、差异文件和实际验证。
PR 继续 Draft，不 ready、不合并、不部署。
本修正通过即达到本包 DONE LINE，停止施工；不自动续开下一包，
不把后续内容质量或动态余韵作为本包阻断项。

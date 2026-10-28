# NV-DREAM-CLIMATE-OFFLINE-01 R5 离线修正与只读取证

Status: `READY_FOR_HUMAN_OFFLINE_REVIEW_R5`

本轮只做离线修正、只读取证和必要离线测试。没有读取或提示 Key，没有调用真实模型或网络，没有创建真实 Store，没有产生费用、重试、ready、合并、部署或另开任务。

## 固定输入

- 仓库：`nuonuo310/Asteria-Nightvoyage`
- worktree：`C:\Users\Administrator\Desktop\Asteria-Nightvoyage-NV-DREAM-CLIMATE-OFFLINE-01`
- 分支：`codex/nightvoyage-dream-climate-offline-01`，Draft PR #109
- 实现起点 HEAD：`48be3aad209db57cf125e69e84b1276cc3177efb`
- 起点 tree：`92d9df190f8f8b89382f3cb4efe74f777e282f47`
- 起点 parent：`de14f237d26b7ee82d5be7196162d661a6291b28`
- 权威提交：`793030f8426ba03f08aa0cabd66b7b908b302744`
- 权威文件 blob：`17228a9130c75530e653ea9ff599535a4841de69`（本地工作副本与权威 blob 字节一致）

施工前逐字读取了权威包全文、权威提交内文件、R1-R4 验证文档、R4 诊断与相关协议。worktree 及其上级没有适用 AGENTS.md。确认没有同包 node 进程在运行后才开始施工。权威提交本地缺失时先执行了 `git fetch origin docs/nightvoyage-dream-climate-offline-01`。

## 唯一内容协议修正

只改了 `scripts/nv-dream-climate-offline-01/protocol.mjs` 的 wake associations 说明，明确 associations 必须是 JSON array，长度为 0 或 1；元素必须为非空字符串；question 对象、null、裸字符串及第二个元素都非法；并给出无剧情占位的两种合法结构：空数组 `[]`，以及恰含一个字符串元素的数组（元素为 `<one unverified question>` 的 JSON 字符串）。明确两者均合法、无首选、不提供固定问题文本。normalization 未放宽，未自动提取 question，未修补或重放真实失败响应；firstFeeling 四态、fragment 逐字要求、residue、情绪规则、源素材、气候、机制、主意象和 scene 提示均未修改。

`git diff` 证明 protocol.mjs 只有两行 wakeRules 变化；sceneSystem 组装所依赖的 commonRules 与 sceneRules 未变，sceneSystem SHA-256 仍为 `ef51d2f7b7f5e5620de1984e4111618a5ab1cf97a2e3011c2d642ad1a34db746`。

## 新候选身份

- promptHash：`9fe4d0863983eae2eb8a969d89fd6ffc5eeab3ebec507bf263d0f27664fbdb66`（旧 `9c855d8b3e3b2a55c3f58e36de4a9aee5dec07b706cbf675912632d6ff8dd119`）
- sourceHash：`605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6`（未变）
- 离线执行文件 protocol.mjs digest：`2a9f4f8fdc643b27010e96ae6fb7d6070b4c635ec228ef691257574e91940fdf`
- 离线 identityHash：`47767f6f733dc657dfef815839b7e9cf3218cff3d4844711a7a3d32c4488dedd`（旧 `f88fccb0349b0004db6c81deb0261f3d620f06480ab24b4a9c3aee2f94cfae28`）
- R4 identityHash：`d23c214166491b5b48c3b221925da7891e541d8d0e15077078a4742ed3e50cdf`（19 个执行文件 + 10 个共享文件）
- phase-b identityHash：`f3789e133289a3aa0cfe29ae0b08ac2bab275db3ebf9791973068b790508c3eb`（22 个执行文件）
- R4 releaseHash：`3ebdae45838bbbbfe51d3b3b9af7f547389a1badc3747bb5bf7976c0eeb0373b`
- phase-b releaseHash：`73002cb681e4950609dea0c35f081bff55acfc95fd27c500bdaff2c9816185b4`（旧 `ee7ab9fbb6f71b582b442d27000d17f153dbfff1ac378ae4691cbfc869401bae`）
- matrixHash 与 price snapshot 未变；price page SHA-256 仍为 `556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3`

phase-b 与 R4 identity 的常量随新离线候选一致性更新；旧提交、旧回执、R1-R4 验证文档和旧身份证据未改写。旧 release 对象已不能被新候选接受：测试确认旧 live 对象抛 `dream_climate_live_release_mismatch`，旧 R4 对象抛 `dream_climate_r4_release_mismatch`。

## 只读取证方法

- 目标文件仅 `C:\Users\Administrator\AppData\Local\Nightvoyage\nightvoyage-dream-climate-one-dream-r4-01\state.json`
- 只使用内建 `fs.readFileSync` + `TextDecoder(utf-8, fatal)` + `JSON.parse`；未 import 或启动 Store、runtime、launcher、secure-input 或任何应用入口
- 未读取 Key、凭据存储、环境变量内容或 PowerShell 历史；未请求模型或网络
- 未修改、迁移、删除或重新保存 Store；未创建 owner.lock、recovery.lock 或 snapshot.tmp
- 读取前后各记录一次字节数与 SHA-256，两次完全一致

结果：读取前与读取后均为 `9869` bytes，SHA-256 均为 `b9c594fda3b4578639d0f10c26616371676eaf70c20ef5259127afcb4b254deb`；`owner.lock`、`recovery.lock`、`snapshot.tmp` 前后均为 false；`unchanged=true`。Store 内中文正常，说明用户此前粘贴输出中的乱码位于输出/复制链路，不能据此认定 Store 损坏。

只读副本：`docs/validation/dream-climate-live-r5-evidence.json`。该文件只含目标 run 的三幕、拒绝 wake 诊断、未发布状态和四笔账务，不含全 Store 或任何凭据。

## R4 三幕原文

以下三幕均为真实模型生成、未发布、虚构非现实事实，逐字保留，不润色。run `nv-dream-climate-one-dream-r4-a` 的计划为 climate=ordinary、mechanism=transformation、foregroundAnchor=cup_tap，两个 used ledger 均为空。

### 第一幕

- event：梦里有一张临窗的小桌，桌面上放着两只白瓷杯，杯里都没有水。靠窗那个人用指节在杯沿轻敲两下，声音很脆，像雨停后屋檐上最后几滴水。另一人从口袋里摸出一张折过的车票，摊开在桌上。窗外是一条湿亮的小街，路面上还映着天光。敲杯的人没有接着往下说，只把杯子转了半圈，杯沿上那一点被敲过的痕迹留在原处。
- appraisal：goalEffect=0，control=0.5，uncertainty=0.5
- before：valence=0，arousal=0.2
- delta：valence=0，arousal=0
- after：valence=0，arousal=0.2
- appraisalBasis：schemaVersion=1，protocolVersion=`nv-dream-climate-offline-normalization-v1`，origin=`dream_appraisal`，isRealityFact=false，verification=`literal_excerpt_only`，semanticSupport=`not_assessed`，evidence 四字段均为 null
- affectDeclaration：schemaVersion=1，kind=`unchanged`

### 第二幕

- event：靠窗那人的拇指停在杯沿的缺口上，来回摩挲。车票摊在桌面，原先清晰的日期被刚才杯底洇开的一圈水痕漫过，最后两位数字只剩模糊的墨影。另一人把空杯向自己拖近，杯底刮出细响，随后在桌面上压住车票一角，使它不再被风吹起。窗外的街亮了，行人踩过水洼朝巷口走去，停在杯沿的拇指没有移开。
- appraisal：goalEffect=0，control=0.5，uncertainty=0.5
- before：valence=0，arousal=0.2
- delta：valence=0，arousal=0
- after：valence=0，arousal=0.2
- appraisalBasis：同上，protocolVersion=`nv-dream-climate-offline-normalization-v1`，verification=`literal_excerpt_only`，semanticSupport=`not_assessed`，evidence 四字段均为 null
- affectDeclaration：schemaVersion=1，kind=`unchanged`

### 第三幕

- event：靠窗那人用指甲沿杯沿的缺口刮了一下，刮下的细瓷末落在桌面上，竟变成一小撮干燥的糖。另一人把杯口朝下扣在车票上，再提起来时，票面的水痕已经干了，模糊的日期反倒清晰成同一天的两个数字。杯底在桌面留下的圆印慢慢合拢，像被桌布吸进去。那人捏起一点糖放进空杯，杯里随即响起很轻的雨声，杯沿又被敲了一下。
- appraisal：goalEffect=0，control=0.5，uncertainty=0.5
- before：valence=0，arousal=0.2
- delta：valence=0，arousal=0
- after：valence=0，arousal=0.2
- appraisalBasis：同上，protocolVersion=`nv-dream-climate-offline-normalization-v1`，verification=`literal_excerpt_only`，semanticSupport=`not_assessed`，evidence 四字段均为 null
- affectDeclaration：schemaVersion=1，kind=`unchanged`

三幕的可观察变化分别落在：第一幕确立敲击痕迹与湿亮小街；第二幕水痕洇开票面日期末两位、空杯压住车票；第三幕缺口细瓷末变形为糖、倒扣杯子使模糊日期清晰、圆印合拢、杯中响起雨声。以上仅为对生成内容的逐字呈现，不是现实事实，也不是质量评价。

## 被拒绝的 wake

- 诊断版本：`nv-dream-climate-single-run-r4-diagnostic-v1`，requestId `nv-dream-climate-one-dream-r4-a-wake-3`
- originalError：`invalid_generated_wake_associations`；subreason：`associations`
- responseAvailable=true，contentByteLength=242，usageValidation=`verified`，settlement=`settled`，publication=`rejected_non_published`，rejected=true，published=false，credentialEchoRejected=false
- 解析后内容（仅为拒绝响应内容，不是正式记录）：
  - fragment：刮下的细瓷末落在桌面上，竟变成一小撮干燥的糖
  - associations：[{question=那点糖是原本就在杯沿里，还是被刮下来的瓷变过去的？}]
  - residue：0.08
  - firstFeeling：status=`uncertain`

该对象数组形状正是本轮协议说明要明确排除的返回；normalization 保持严格拒绝，没有把 question 自动提取成字符串，也没有把拒绝响应转换后冒充成功。受影响的诊断字段中没有原始 provider 文本或解析前 JSON 字段；本轮只允许一次只读取证且已完成，因此不对原始返回作超出该诊断对象的推断。可确认的仅为该 wake 以对象数组形状被拒，subreason 为 associations。

## 未发布与停止位置

- 已生成但未发布：三幕 draftScenes 保留在失败 run 中，run.scenes 字段不存在，entryId 为 null，entries 中该 run 为 0 条，journal 无该 run 记录
- 未保存的 wake：拒绝响应未成为正式 wake
- 未记录的 firstFeeling：诊断内 uncertain 只是拒绝响应内容，不是正式 firstFeeling
- 未创建的 residue：诊断内 0.08 只是拒绝响应内容，不是正式 residue
- 未开始的 B、C 两场：没有第二个 run，没有第四场，也没有后来回想

## 四笔账务

四次调用均已完成 usage 验证并结算，合计 15690 micro-CNY；unknown 占用为 0。该合计是本候选按已记录 usage 计算的账务额，不是 provider 实扣确认。

| 调用 | 阶段 | 输入 tokens | 输出 tokens | 状态 | 计费 micro-CNY | 预留 micro-CNY |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | scene 0 | 983 | 162 | settled | 3262 | 35968 |
| 2 | scene 1 | 1302 | 159 | settled | 3876 | 35968 |
| 3 | scene 2 | 1619 | 162 | settled | 4534 | 35968 |
| 4 | wake 3 | 1745 | 66 | settled | 4018 | 35968 |

settled 合计 `15690` micro-CNY；unknown 预留为 `0`；两者相加的账务口径仍为 `15690`，但 `combinedIsProviderCharged=false`。不能把账务额当成 provider 实际扣款。

## UTF-8 往返证据

`single-run-r4/secure-input.ps1` 已改为关闭桩：在读取凭据、写 release、创建真实 Store 或发网络请求之前输出 `OFFLINE_REVIEW_REQUIRED_R5` 并以 exit 2 拒绝。原 ProcessStartInfo 捕获逻辑移到无凭据的 `utf8-capture.ps1`（严格 UTF-8 字节读取、无 BOM 输出），`utf8-roundtrip.ps1` 与 `utf8-stub.mjs` 仅用于离线 stub 验证。

实际 Windows PowerShell 调用 Node stub 的往返结果为：退出码 0，输出文件为严格 UTF-8 且无 BOM；解析后 payload 与源文本逐字一致，共 26 个 code point；中文、双引号、反斜杠、LF、CRLF 以及非 BMP 字符 U+1F600、U+1F319、U+2000B 均正确。stdout 与 stderr 也逐字一致。测试使用 `-ExecutionPolicy Bypass` 仅为当前进程绕过本机脚本执行策略，不修改用户全局终端设置。

## 入口关闭

R4 secure-input 与 worker 的真实路径均关闭为 `OFFLINE_REVIEW_REQUIRED_R5`：不接受凭据、不写 release、不创建或读取真实 Store、不发起网络请求、不重试、不启动第二次 run。worker 仅保留无凭据的纯静态 preflight；由于真实 R4 Store 已存在，preflight 会以 `dream_climate_r4_store_already_exists` 拒绝，不会被重定向到旧 Store。R3 旧入口继续关闭。

## 实际测试

- `node --test test/dream-climate-live-r4.test.js`：30/30 通过（新增 synthetic 对象数组 wake 用例）
- `node --test test/dream-climate-live-r5.test.js`：5/5 通过（associations 形状、builder system 与新身份、旧 release 拒绝、实际 PowerShell UTF-8 往返、关闭入口与只读证据）
- 六个梦境气候专项合并运行：82/82 通过（R1-R5 + 离线协议）
- 必要回归：rich-fictional-dream-sample、phase-b、generated-wake-offline、generated-wake-story、fictional-source-probe、wake-first-feeling、versioned-wake-admission 共 60/60 通过
- `node scripts/check-generated-wake-offline.mjs` 与 `node scripts/check-versioned-wake-admission.mjs` 均退出 0，报告 `userStoreAccessed=false`、`networkAttempts=0`、`realModelRequests=0`
- `git diff --check` 无空白错误

调试过程中曾出现三类仅由本机真实 R4 Store 已存在引起的断言失败（原测试假设 Store 不存在）、以及由 phase-b release pin 未随新身份更新引起的导入失败；均已在离线测试与配置一致性范围内修正，没有触碰真实 Store 或旧账。首次合并运行 R4 测试时为 3/30 通过，修正后为 30/30。

## 协议说明修正与历史失败的区别

本轮的协议说明修正是针对未来请求的提示文字，现有严格校验 unchanged；它不证明真实模型必然遵循新提示。R4 已经发生的 `invalid_wake` 失败、三幕 draft、四笔 settled 账务、拒绝 wake 内容、旧 release、旧 Store、旧回执和 R1-R4 验证文档均原样保留，没有改写、重放或追认其子原因之外的内容。离线 synthetic 测试不能替代真实运行结果，也不能用其转换结果冒充修复成功。

## 交付限制

本地没有 `gh` CLI，也没有可用的 PR 元数据编辑能力；因此无法在本轮修复 PR #109 描述中的 UTF-8 问号乱码，需由总控处理。普通提交已推送到同一分支，PR 保持 Draft。

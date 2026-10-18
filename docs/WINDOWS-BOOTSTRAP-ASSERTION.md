# Windows 完整回归：旧环境断言修正

状态：`test_expectation_corrected / windows_full_pass_user_reported / exact_run_identity_not_reprinted`。

2026-10-18，用户回报完整 npm.cmd test：855项，854通过、1失败，取消/跳过均0，耗时80668.4423 ms。唯一列出的失败是 test/inline-bootstrap.test.js 的 child environment drops keys, Node flags, proxy, module lookup and arbitrary app configuration。回报没有重复打印本次 commit/Node 版本，不将此前命令要求的 main 或此前 Node 版本当成这次新实测。原失败聚合见 [user-local-windows-full-failure.json](validation/user-local-windows-full-failure.json)，不因后续修复覆盖成通过。

## 根因与修正

src/inline-child-environment.js 在此前 Windows 修正中已为 libuv 自动补充的变量提供空占位，然后由 worker 校验并移除不需要的字段，见 [INLINE-WINDOWS-ENVIRONMENT.md](INLINE-WINDOWS-ENVIRONMENT.md)。旧 bootstrap 单元断言仍在所有主机上只期待 SystemRoot、TEMP、LANG。Windows 默认分支另外返回 HOMEDRIVE/HOMEPATH/LOGONSERVER/PATH/USERDOMAIN/USERNAME/USERPROFILE/SYSTEMDRIVE/WINDIR 的空值，因而与旧断言不相等。

本轮先在未修改的实现上强制 platform=win32，复现该精确旧预期不成立；这只是 Linux 上的合成分支探针，不是 Windows 实机替代。随后仅修改 test/inline-bootstrap.test.js 的这一个测试体：

- platform=linux 对照固定的三字段预期。
- platform=win32 对照固定三字段加九个空占位的精确预期，不从被测函数生成 expected。
- 无 platform 覆盖时，对照本机相应固定预期，继续验证主机默认行为。

没有忽略多余字段、按实际结果改写 expected、删除断言或跳过 Windows。Key、NODE_OPTIONS、NODE_PATH、代理、HOME 和 NUL TMP 的排除继续受精确对象比较约束；既有专门测试还检查私有 getter 不被读、非空占位拒绝、未知字段先拒绝、worker 清理和真实子进程环境。

## 验证范围

Linux Node v24.19.0：针对 bootstrap 与 child-environment 共36/36通过；完整套件结果记录在 [windows-bootstrap-assertion-fix.json](validation/windows-bootstrap-assertion-fix.json)。测试数量仍为855，没有为增加计数拆分现有测试。生产源码、付费源码清单/图、合同、批准、额度、期限与占款规则均不改，未访问用户 Store、凭据或真实模型。

修正后的 Windows 完整结果仍需用户执行；旧854/855仍为失败，不能用 Linux 全过或强制 Windows 参数的单元分支证明 Windows 全过。不自动追加模型试跑，内容质量与 Asteria 对接仍待各自验收。本轮使用自有测试代码，无第三方复制或私有梦簿内容。

## 后续用户完整通过回报

2026-10-18 用户回报855项全部通过、失败/取消/跳过/todo均0，耗时80994.6301 ms，见 [聚合记录](validation/user-local-windows-full-pass.json)。这是修正交付后的新回报；上文待重跑为修复当时状态，现有用户统计回报已收到。其尾段未含本轮 commit/Node，不将先前要求的277b137或此前版本补写成实际已打印身份。原失败记录继续保留，不要求用户重复运行；完整统计通过不证明生成质量或 Asteria 兼容。

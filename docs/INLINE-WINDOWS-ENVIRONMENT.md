# Windows 子进程环境兼容修复

状态：`source_mismatch_fixed / user_reported_windows_script_passed`。用户在Windows Node24.19.0更新源码后，无Key自检的子进程被拒绝。附件只能证明自检没有通过；本轮不把它登记为Windows全套测试或模型结果，也不上传原始终端内容、私人路径或数据。

核对[Node24.19.0内置libuv启动源码](https://github.com/nodejs/node/blob/v24.19.0/deps/uv/src/win/process.c)后确认一个可复现的策略不匹配：Windows的libuv会向缺省的子环境补入一组OS变量，原入口只允许父启动器显式选出的几个名字，因此合法Windows补入项也会被拒绝。此前Linux和Linux CRLF测试都没有模拟这项OS行为，不能代替Windows验证。此处借鉴的是平台行为知识；下述策略为项目独立实现，没有复制Node/libuv的C实现或其他第三方代码。

## 策略

`inline-child-environment.js`统一父进程构造与两个worker的启动检查。Windows父进程仍只复制有限系统根目录、临时目录和语言设置；SYSTEMDRIVE只接受盘符或空值。HOMEDRIVE、HOMEPATH、LOGONSERVER、PATH、USERDOMAIN、USERNAME、USERPROFILE显式传空字符串，防止libuv从父环境补入私人值；读取这些私人字段、Key、Node预加载和代理并非构造环境所需。

子进程在加载核心之前验证这组受抑制字段必须为空，然后移除它们。Windows系统字段名按大小写不敏感核对；不是开放任意环境继承或遇到未知字段就全部删除。非空PATH/用户资料、Key、NODE_OPTIONS、NODE_PATH、代理及任意未知应用配置依然拒绝，未知字段的值不会被读取或回显。Linux保持原来的严格规则，不因Windows兼容而允许PATH或USERPROFILE。

启动器继续使用绝对Node可执行路径、无shell、独立execArgv与受限加载；真实Key仍只在完整合同/owner历史/预算/下一请求准入之后通过一次私有管道传入。没有加入用户真实数据、自动重试或收费动作。

## 身份与结果

当前固定合同另存为 `docs/proposals/inline-paid-entry-windows-20261017.json`，编号 `inline-evidence-paid-entry-windows-plan-20261017`。四份此前草案原样保留，旧profile和占款不变；本轮不迁移批准、不创建用户额度、不释放或重试unknown。原价格复核和到期时间不变，没有刷新价格或期限。新hash在真实调用前仍需具体确认。

新增18项验证显式占位、受抑制字段不读取、Windows大小写规则、非空私人字段/Key/预加载/代理/未知项拒绝、Linux规则和实际干净子进程。Windows策略分支在Linux通过显式平台fixture复现；这不是Windows实机。完整结果见[验证记录](validation/inline-windows-environment-validation.json)。源码清单86文件；核心静态图规模保持33/184/4、stub入口34/186/4、付费session37/221/5，不声称OS沙箱或完整动态闭包。

用户已在Windows原仓库完成复测，复现命令：

```sh
node scripts/check-inline-paid-entry.mjs
```

脚本仍只创建和清理独立虚构临时历史，内置rehearsal模拟器、dummy凭据、零真实模型请求。用户报告此脚本在win32／Node24.19.0完成：3次模拟调用和3条settled，读取/重放追加调用与凭据索取均为0，旧账户保持、撤回重开清除通过；仅这一条独立模拟路径有Windows实机证据，不是Windows全套测试。真实网络、语义支持和梦境质量仍未验收。Asteria未修改，公开仅独立表述、自有MIT实现和虚构测试。

本次仅登记独立模拟自检的聚合技术结果，见[用户本地Windows自检记录](validation/user-local-inline-paid-entry-windows.json)。未上传终端原文、私人路径或内容；未把fixture时钟、dummy凭据或自检通过变成真实费用/外发授权。下一步可确认当前具体合同后再进行有界真实试跑。

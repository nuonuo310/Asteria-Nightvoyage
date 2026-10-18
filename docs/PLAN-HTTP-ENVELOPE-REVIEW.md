# HTTP返回类型拒绝：证据与离线分类

2026-10-18用户回报显式接续诊断进入授权后action，登记1个生成调用意图，返回 `http_content_type`，未保存正文，usage unknown，撤销回报true。公开记录仅保留独立表述，不含用户编号、链接、回调或原始回执。

根据该版本正式传输的控制流，Content-Type检查位于status必须等于200之后、读取正文之前。因此本次回执支持“HTTP 200，但Content-Type未通过SSE要求”；不能进一步断言具体MIME、正文结构、供应商错误码、模型推理资格或根因。旧记录没有原始头或正文，不能恢复这些信息。

## 官方约定复核

2026-10-18重新读取官方文档：

- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)：固定公开Responses地址，store false、stream true，消费流直到response.completed。
- [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)：订阅HTTP请求使用流式；不支持max_output_tokens等字段。
- [Errors and recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery)：流建立前的拒绝未必使用标准error对象，也可能返回detail结构；这些描述文本不能当稳定错误码。实际HTTP状态、错误结构及可用错误码应分别判断。

没有找到把任意HTTP 200 JSON/HTML当作订阅流成功的依据。正式传输仍要求SSE及完整终态，不能靠猜测跳过Content-Type检查或将非流JSON直接存为梦。也没有证据把本次问题归因于VPN、区域、账户、余额或模型本身。

## 已实现：非分发的离线分类器

`scripts/plan-envelope-review.mjs`接收显式提供的状态、Content-Type和可选字节，仅用于独立离线fixture。目前没有接入正式HTTP路径或增加真实调用入口。

输出固定字段：数值HTTP状态或null、媒体枚举、正文外形枚举、官方错误码/参数白名单或unknown，以及固定的“不返回正文、不接受推理、不允许分发、用量unknown、质量未评估”。不返回原始头、错误message/detail、请求ID、模型文本、异常或任意参数值。

| 输入观察 | 输出示例 | 能证明什么 |
| --- | --- | --- |
| application/json，response对象 | json / json_response | 仅是响应对象外形，不能当流式推理成功 |
| JSON error对象 | json_error，白名单code/param | 仅识别被提供的固定错误码，不推断计费或权限 |
| detail对象 | json_detail | 仅结构存在，不输出或解释其自由文本 |
| HTML或普通文本 | html_like / unparsed_text | 仅外形，不推断是哪个网关或代理 |
| SSE前缀 | sse_like | 仅外形，不校验终态或释放文本 |
| 未提供字节 | not_read | 不根据头猜正文 |

字节上限8192，UTF-8严格解码；非字节、超限、无效编码、空体、非对象JSON和未知类型均固定分类。MIME仅映射闭合枚举，使用Map避免特殊对象键落入原型。实际网络读取尚未实现；本地有界分类不代表供应商或网络读取已被验证。任何未来正式诊断接入仍须独立审查、来源与次数控制、取消/时限/撤回核验，并在真实请求前取得相应授权。

## 验证与状态

```sh
node --test test/plan-envelope-review.test.js
```

5项独立合成测试覆盖媒体/正文外形、白名单和自由文本抑制、字节/编码/状态边界、特殊对象键、返回值分离，以及模块无网络/账号/Store/执行依赖。全量989/989通过，详见[核验汇总](validation/plan-envelope-review.json)。

没有读取用户Store或凭据，没有真实请求，没有更改正式传输、旧候选源码哈希或已消耗批准。原诊断与接续保持停止；本次只补齐离线检查手段和证据边界，尚未解决真实Content-Type不匹配。需要实际类型和结构时，只能来自另行批准的新诊断，不能重构已丢弃响应或复用已消耗许可。Asteria桥、原生Codex与整体梦境质量仍未因此获得验收。

实现独立，采用项目MIT，无第三方实现复制或新依赖；公开参考仅用于协议事实。

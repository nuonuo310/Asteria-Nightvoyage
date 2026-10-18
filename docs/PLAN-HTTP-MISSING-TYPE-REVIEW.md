# Missing Content-Type and bounded-prefix review

## Reported observation

The user supplied a Windows receipt from `plan-http-envelope-probe-v1`:

| Field | User-reported value | Meaning |
| --- | --- | --- |
| Additional request intents | 1 | The new diagnostic permission is consumed |
| HTTP status | 200 | HTTP success alone does not prove inference acceptance |
| Media class | `missing` | The header accessor returned null or an empty string; raw header was not saved |
| Read outcome / body shape | `byte_limit` / `over_limit` | Response chunks exceeded the 8192-byte inspection ceiling; no complete body was classified |
| Error code / parameter | null / null | No error code was established; this does not prove absence of an error |
| Remote revocation | true | Checked cleanup reported successful revocation |
| Usage / money | unknown / unknown | No billing or quota quantity established |
| Body saved / dream accepted | false / false | Metadata observation is not a generated dream |

This is user-reported execution evidence, not an independent maintainer live run. The public record deliberately omits authorization links, callback values, local paths, timestamps identifying a local approval, account bindings and runtime identifiers. No local runtime file is imported or published.

The response might have contained a stream, HTML, JSON or something else. Neither its format nor a VPN, provider or application root cause is established. A larger response does not justify silently increasing inspection limits. The transient chunks were discarded, so this response cannot be retroactively classified.

## Offline implementation

`plan-envelope-prefix-review.mjs` is a standalone pure helper for independent synthetic bytes. It inspects at most the first 8192 bytes and returns fixed labels only: SSE-like, HTML-like, JSON-like, empty, unrecognized, invalid input or invalid UTF-8. A trailing partial UTF-8 code point at the ceiling is tolerated during prefix decoding; malformed bytes within the inspected prefix are rejected.

Prefix labels intentionally do not parse JSON error codes, prove a completed SSE response, infer use of a model, estimate billing, recover old output or accept a dream. A fake SSE-looking prefix followed by arbitrary content still produces only a prefix label. No bytes or text are returned.

**In the offline slice recorded here, the helper was not wired to any live observer or adapter.** A subsequent [separately approved prefix diagnostic entry](GPT-PLAN-PREFIX-PROBE.md) now uses it behind a fresh approval gate; it still does not change production inference acceptance. Existing diagnostic and inference source closures, permissions, caps and acceptance rules are unchanged. The consumed diagnostic cannot execute another request. No new login or real subscription call occurred in this slice.

## Verification and next step

Four new independent synthetic tests plus five existing classifier tests pass 9/9; the full Linux Node.js suite passes 1009/1009. Tests cover oversized inputs, misleading markers, incomplete JSON, SSE completion text without acceptance, ignored bytes beyond the ceiling, UTF-8 boundaries, detached output and absence of network/storage/authorization dependencies. See [validation](validation/plan-envelope-prefix-review.json). This does not validate Windows or a live prefix reader.

The next engineering decision is how a separately scoped observer could preserve bounded prefix labels while leaving inference acceptance strict. Such an observer is not implemented by the helper itself. The subsequent entry has its own lifecycle/storage tests and still requires a fresh explicit real-request permission. Do not rerun the consumed entry or change to API automatically. Direct GPT eligibility, native Codex transport, Asteria bridges and dream quality retain their previous unverified/pending state.

Independent MIT implementation, no third-party code copied or dependency added. No private source material or real dream body is included.

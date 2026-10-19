# Bounded startup stderr observation

## What changed

`scripts/codex-startup-diagnostics.mjs` is an original pure streaming diagnostic reader. It accepts byte chunks, decodes UTF-8 incrementally, handles split lines and ANSI colors, and reports a small fixed vocabulary. A complete short error line is observable immediately through push; it does not wait for process exit or a 4096-byte block. finish handles a final unterminated line. Malformed input, oversized lines, excessive lines and excessive total bytes terminate the reader with a fixed error.

The limits are 32 KiB overall, 8 KiB per line and 128 lines. Returned records contain labels and counters, never raw stderr, configuration values, URLs, paths or credentials. Labels distinguish a reported bubblewrap lookup failure, an unrecognized configuration warning, an otherwise unclassified error, and other unclassified stderr. Labels are observations of text, not authenticated provider attestations or a complete native-error taxonomy. Every report keeps dispatch and tool-exclusion verification false. Empty stderr is explicitly not proof of healthy startup.

This helper does not spawn a process, execute a tool, open a Store, approve a model turn or modify the live adapter. The prior independent Node pipe rehearsal remains unchanged. A future native owner must still enforce deadlines, process cleanup, approvals and unknown-attempt recovery; this reader does not implement those responsibilities.

## Directly observed issue and comparison

The preceding scratch Python diagnostic used a buffered read of 4096 bytes for stderr. That can postpone a short error until EOF or the buffer fills. The revised diagnostic used read1, which exposed native startup messages while the native process was still running. This was a diagnostic-harness correction, not a repair to the dream engine or a proven cause of thread timeout.

On the maintainer Linux codex-cli 0.159.2, a PATH containing only Node's directory produced a reported bubblewrap lookup failure. An additional experimental tools.view_image=false setting also produced an unrecognized/deprecated-setting warning. Neither setting nor warning is silently treated as effective tool exclusion.

A comparison with the native executable, Node and installed bubblewrap directories available on an explicitly constructed PATH, and the unsupported image setting removed, did not report those two specific errors. It still emitted unclassified stderr in the subsequent metadata-only observation. No healthy-startup or zero-warning claim is made.

Separate native thread-preparation comparisons verified in-memory config/read values selecting the fictional loopback provider, the exact loopback endpoint and requires_openai_auth=false. Explicit experimental capability opt-in, a minimal thread/start parameter comparison, a fresh-home comparison and a CLI exec differential did not produce a local fixture request before their deadlines. The app-server thread did not return, so no app-server turn/start was sent. The exec comparison used only independent fictional input and the same local error fixture, not an authenticated provider. These are unsuccessful preparation experiments; they do not identify the timeout's cause or prove a general upstream defect.

## Verification and boundary

Independent fictional tests exercise a real Node child that emits a short stderr line and remains alive. The test receives the diagnostic before child exit, then closes and awaits that child. Further tests cover split UTF-8/CRLF/colors, unknown text suppression, empty streams, duplicate labels, EOF, malformed bytes and terminal resource limits. They do not start Codex or contact a provider.

A separate actual metadata-only native comparison fed stderr captured while each native process was still alive into the implemented reader. Only sanitized labels and counters are retained in docs/validation/codex-startup-diagnostics.json. No login, thread/start or turn/start was issued in these two recorded metadata observations. Their owned processes were awaited and temporary directories removed. Background network activity was not instrumented; there is no blanket zero-network or revocation claim.

The unresolved dependency remains native thread preparation and effective tool-set qualification. No real subscription trial, account adoption, API fallback, old-run continuation or new dream-quality acceptance is authorized by this slice. Direct GPT remains the intended primary entry; Codex remains a separate, currently non-admitted native backup. Asteria bridges and canonical state remain outside this repository.

## References and provenance

The code and fictional peer are independent project implementations; no native implementation or generated schema bundle is copied. Relevant public references are the [official app-server lifecycle](https://learn.chatgpt.com/docs/app-server), [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) and [CLI reference](https://learn.chatgpt.com/docs/cli/reference). Native warning observations are scoped to the binary and invocation measured here, rather than inferred solely from documentation.

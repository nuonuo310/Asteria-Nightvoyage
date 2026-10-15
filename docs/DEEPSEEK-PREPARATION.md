# DeepSeek offline preparation

Status: protocol preparation and local simulation only. No live request, credential read, private material, price assumption or spending authorization. The existing CLI still runs the deterministic fake provider.

## What is implemented

`src/deepseek-protocol.js` builds a non-streaming chat-completion request and parses simulated responses. JSON output is requested with an independent JSON shape example; tools are absent, thinking is disabled, and output is bounded. The adapter whitelists fictional snapshot fields and supplies the previous scene and simulated affect. It accepts only reviewed model identifiers, explicitly supplied by the caller; using a model name in a test does not select or authorize it for live use.

The decoder rejects incomplete finishes, tool calls, empty/oversized content, malformed JSON and missing/inconsistent usage. HTTP errors become fixed codes without response bodies. Reasoning text and arbitrary provider metadata are not retained. `OfflineDeepSeekProvider` extends the fake provider for engine rehearsal and requires an explicitly supplied simulator; it contains no HTTP implementation, credential loader or automatic retry.

Current engine reservations remain fake estimates. Parsed provider usage is exercised as protocol data, not persisted as a real billing ledger. The 3-bytes-per-output-token check is a local defensive byte bound, not DeepSeek tokenization or a monetary guarantee. The underlying engine still rejects ordinary real providers and real-source snapshots.

## Public documentation checked 2026-10-15

- [Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/): request fields, completion finish state and usage envelope.
- [JSON Output](https://api-docs.deepseek.com/guides/json_mode/): JSON mode also needs a JSON instruction/example; empty content is possible.

Reviewed model names in the current API page: `deepseek-flash`, `deepseek-v4-pro`. Old model aliases are not assumed. Exact availability and prices must be checked again before live setup. No SDK or third-party implementation was copied; this uses independent protocol code and Node.js standard libraries.

## At-home handoff and remaining live work

1. Confirm the exact model and current official prices, then explicitly approve total run/call/CNY limits. The conversational suggestion of three dreams, nine calls and CNY 1 remains unapproved; it is not active configuration.
2. Implement and review an opt-in live transport and durable cross-run money/call ledger. Reserve conservative maximum cost before dispatch; retries and unknown attempts retain reservations. Do not promise a CNY cap using approximate fake token counts. The live runner must refuse to start without validated pricing, allowance and explicit egress permission for fictional fixtures.
3. Put the API key in an environment variable or an external local file on the user's computer, outside the checkout. Do not paste it in chat or commit it. Credential handling and a Windows setup command are not yet implemented; no real setup command is supplied prematurely.
4. Test that live gates, sanitized failures and cumulative limits work with stub HTTP before authorizing actual requests. Then run fictional trials, inspect scenes, affect and wake fragments together, and keep quality assessment separate from mechanism tests.

The current input grants explicitly forbid model egress. This preparation must not silently flip them. Any future fictional trial needs a separate explicit egress-grant path. Real material remains excluded.

Windows execution, actual DeepSeek compatibility, API latency, billed token counts, cost and dream quality are unverified. A local simulator cannot prove them. No Asteria or other repository was changed. This preparation PR is not merged under the earlier authorization, which applied specifically to PR #1.

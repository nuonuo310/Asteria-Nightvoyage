# Native harness stages against a fixed local provider

This slice connects a fresh Codex app-server process per stage to the versioned local DreamModelPort, but only with an owned loopback provider returning independently scripted fictional data. It does not connect Codex to OpenAI inference, log in, load a credential, or supply a real model catalogue. Native harness execution and real model generation are separate facts.

## Explicit factories and identity

- `createNativeCodexFixtureStageTransport({executable,timeoutMs?})` requires an explicitly selected absolute native codex executable. It never resolves a default from PATH. Its protocol identity is codex-native-fixture-stage-v1.
- `createPeerCodexFixtureStageTransport({timeoutMs?,scenario?})` is the independent automatic-test peer, with codex-peer-fixture-stage-v1 identity. Its closed fictional fault scenarios cannot select a native program.

Both factories pin gpt-5.6-sol and accept no endpoint, token, auth, environment, arbitrary fixture response or model override. Module-issued identity is required by the versioned local adapter. Its provider/auth identity remains openai_protocol_simulator/synthetic_stub and external generation remains false, including for the native fixture harness. The ordinary production CodexAdapter remains unavailable. Native and peer fixture transports have different protocol identities and cannot silently adopt one another's book.

There are at most three exchanges per transport and one active exchange. Completed replay remains readable without consuming another exchange; a fourth invocation is rejected before spawning. Async close aborts and awaits the current exchange and permanently closes readiness. No automatic retry, provider/model fallback or account authorization is added.

## Stage owner

`scripts/codex-fixture-stage-owner.mjs` is an explicit stage-scoped derivative of the checked local observation owner. Original observers remain unchanged. Its public launch shape is closed, and it unconditionally uses fresh state/profile/cwd, the checked independent fictional catalogue, explicit empty turn environments, selected utility disables, no inherited credential/Node/proxy environment, no-auth loopback Responses configuration and zero provider retries. There is no expected-stderr exception for these ordinary final answers. Unknown notifications, warnings, tools and startup errors still stop. Exact account-rate opt-out is requested; enforcement remains unverified and payloads are not interpreted.

The actual outgoing POST must declare an empty tool inventory and contain the exact stage prompt as a user input_text. Only then does the local provider return a fixed scene or wake JSON value. Earlier scene events must match this independent fixture's known sequence; it does not invent a response from source text or accept an arbitrary caller answer. One local POST and one ephemeral app-server turn are allowed per stage. Request/response limits are local byte/frame bounds, not token or monetary ceilings.

A final-answer reviewer binds thread, turn and item identities, exact expected final text and completed turn. Partial text, a failed/interrupted turn, changed answer, hidden tool, wrong input, missing completion or cancellation cannot release a stage reply. The accepted final transcript is transient and passed privately to the adapter's existing decoder and typed scene/wake validator only after owned process closure and temporary workspace cleanup. The engine remains responsible for the durable intent/checkpoint and source withdrawal. The stage report returns metadata only and contains no prompt, final text, raw stderr, tool arguments, provider IDs or local paths. Usage remains unknown. A selected_call_unsupported observation is not required or reused as an authorization for this fixture mode.

The same prior limitations remain: empty declared tools do not prove all native handlers are denied; a fictional catalogue does not establish real model tool exposure; descendants and background network containment are unqualified. No account or native subscription entitlement follows from this loop.

## Check and evidence

`node scripts/check-codex-fixture-stages.mjs` runs independent Node peers only. The explicit `--native-executable ABSOLUTE_NATIVE_CODEX_PATH` variant runs the installed native harness against the same owned local fixtures. Both create a disposable fictional book outside the checkout. Success checks two saved scenes, grounded wake, three closed children before publication, reopen/replay with zero additional children, original preservation and source withdrawal across reopen. Failure prints a sanitized receipt and stops at that stage, with no fallback. The temporary qualification book is removed after the check; no user dream book is opened.

Automated tests use independent fixtures only. They cover changed input/answer, failed turn, tool request, first/second child death, timeout, withdrawal, preserved ambiguous checkpoint, no repeat dispatch, the three-exchange cap and closed factory controls. [Validation and final-source hashes](validation/codex-fixture-stages.json) distinguish independent-peer results, actual maintainer native results and the pending Windows native comparison.

The minimum next external step is one installed Windows 0.160.0 fixture-stage check. It needs no account login, credential or real inference approval. A later authenticated native provider is a separate transport and requires separate review and user confirmation. Existing failed subscription trials and old grants are not reused. Asteria bridges, canonical state, user materials, paid APIs and other repositories are untouched.

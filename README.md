# Asteria-Nightvoyage · 夜航

Experimental standalone dream layer: fictional input snapshots → two scenes with simulated affect → a separate wake record and decaying residue → typed cue-recall candidates.

Requires Node.js 24+. No packages, credentials or network model calls are needed.

```sh
npm test
node src/cli.js /absolute/path/outside-this-checkout/nightvoyage-data demo
node src/cli.js /absolute/path/outside-this-checkout/nightvoyage-data list
node src/cli.js /absolute/path/outside-this-checkout/nightvoyage-data recall lantern
```

On Windows use `npm.cmd test` if PowerShell blocks npm.ps1, and an external absolute data directory such as `C:\NightvoyageData`. Windows runtime behavior has not been tested in this delivery.

The demo is deterministic fake generation. Rerunning it returns the same durable run, not another dream. The API in `src/engine.js` supports explicit new request/session IDs, cancel/resume, append-only recollection/continuation, policy changes, withdrawal and deletion. CLI `resume` intentionally does not authorize retrying an ambiguous attempt; use the explicit API option after reviewing the receipt.

Input material kind and generated event origin are separate. Dreams are never reality facts, including in recall and derived records. This release rejects real input materials and non-fake providers. It cannot modify personality, factual memory, daily emotion, tasks or tools. There is no Asteria adapter or frontend.

See [contract](docs/CONTRACT.md), [plan](docs/PLAN.md), [fictional walkthrough](docs/WALKTHROUGH.md), [references](docs/REFERENCES.md), and [progress and limitations](PROGRESS.md). Storage and backup boundaries are part of the contract. Do not commit local runtime data, real journals, chats, private configuration or credentials. MIT licensed.

DeepSeek preparation is available as an **offline protocol/simulator**, not a live CLI mode. See [offline preparation and at-home handoff](docs/DEEPSEEK-PREPARATION.md). No API key is needed for its tests; real transport, spending controls and egress authorization remain pending.

[Budget accounting and gated transport](docs/BUDGET-AND-TRANSPORT.md) are separate API components. Transport defaults off, no actual pricing/allowance is bundled, and the CLI remains fake-only. Tests use stub HTTP. Live engine integration and external credential/Windows setup are still pending.

The review branch includes an integrated budgeted runtime and `nightvoyage.cmd` launcher. [Windows handoff](docs/RUN-ON-WINDOWS.md) covers initialization, key entry, preflight, resume and the CNY 1 reservation conflict. Defaults send nothing; actual Windows/API execution remains unverified. A higher allowance needs explicit approval.

The first user-local three-run fictional trial is complete (reported nine calls; further calls blocked). [Trial review and protocol v2 correction](docs/FIRST-LIVE-TRIAL-REVIEW.md) distinguish observed mechanics from remaining quality issues. New grounded-wake code has offline evidence only; no additional paid trial is enabled.

[One additional grounded-wake validation](docs/GROUNDED-WAKE-FOLLOWUP.md) has a separate one-run/three-call/CNY 3 approval and reports cumulative accounting without resetting the first trial. The follow-up CLI defaults to no network; user-reported Windows 90/90 tests and one grounded-wake live sample are recorded in the handoff. Its allowance is now complete; broader narrative quality remains unaccepted.

[Dream-quality evaluation plan](docs/QUALITY-EVALUATION.md): six independently authored fictional inputs, an offline checker and a blank human-review template. Inputs deny model egress by default; no new live evaluation is enabled.

[Three-case evaluation entry](docs/QUALITY-BATCH-ENTRY.md) pins the selected fictional inputs and protocol, keeps a separate immutable three-run/nine-call allowance, and stops on unresolved attempts. It was prepared with offline simulator evidence before the separate egress and spending approval below. Its approved batch is now complete; `node src/quality-cli.js preflight` needs no key.

The user subsequently approved and reported completion of that three-case live screen: nine settled calls, then the call cap blocked further generation. [Limited quality review](docs/QUALITY-SCREEN-REVIEW.md) records grounded excerpts alongside remaining appraisal, viewpoint and excerpt-selection concerns. General dream quality remains unaccepted; no further paid run is approved.

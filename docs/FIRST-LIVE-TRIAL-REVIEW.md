# First fictional live trial and wake correction

## Observed scope

The user supplied terminal output from three Windows-local DeepSeek runs using the same pinned fictional fixture. These are user-reported results, not an independently observed Windows session or a provider invoice. No raw runtime journal, generated narrative, run IDs, private transcript or key is published here.

| Slot | Result | Calls | Input tokens | Output tokens | Conservative ledger micro-CNY |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | completed | 3 | 1526 | 251 | 5060 |
| 2 | completed | 3 | 1464 | 226 | 4736 |
| 3 | completed | 3 | 1430 | 231 | 4708 |
| Total | three completed runs | 9 | 4420 | 708 | 14504 |

Final preflight reported `ready:false`, `reason:call_limit_reached`, three runs, nine calls and 14,504 micro-CNY (CNY 0.014504). This is the expected cumulative call gate, not a generation failure. The CNY 3 ceiling was not exhausted; unused money does not authorize a fourth run. No allowance or data directory is reset.

Slot 1 also had a reported successful reopened replay and cue recall, retaining dream identity and unchanged call/money totals. Optional PowerShell JSON piping failed on mojibake; direct output and subsequent preflight succeeded. The original 78-test correction suite passed on the user's Windows computer. New changes below have only Linux evidence.

## Quality review

Three runs of one seed show local variation, not adequate coverage of dream diversity. All examples remain limited by the same source imagery and short output budget. No mood quota or required insight should be added. Empty associations are valid; any association remains a non-factual, unverified dream association rather than a task or memory update.

Manual comparison found wake notes adding details or aftermath that were not recorded in the scenes. Keeping those notes separate prevented overwriting the original, but separation alone does not make their claims faithful recollections. Narrative address also varied; the scene prompt did not state a consistent fictional viewpoint. Overall generation quality is not accepted from these three samples.

## Implemented correction: protocol v2

For new DeepSeek generations, `fragment` must be a non-whitespace contiguous verbatim excerpt from one saved scene event. A program-side check validates this after protocol parsing and before settlement/publication. The model cannot validate its own citation. Integrated wake output includes program-owned `fragmentBasis:{kind:scene_excerpt,sceneIndex}` (zero-based). The canonical original scene remains the authority; source-memory text is not a fallback.

No paraphrasing, trimming, combining scenes, pronoun changes or new aftermath is allowed inside that fragment. Residue and optional unverified associations remain separate. The two dream scenes remain generative and may be ordinary, warm, strange or unsettling. Later recollection and imagined continuation remain separate existing record types.

This is a deliberately narrow extractive wake policy, not a claim to validate meaning, subjective memory or emotional authenticity. A selected substring can lose context; scene linkage supports inspection but does not prove semantic completeness. Richer paraphrased waking recollection requires a future explicit uncertainty/evidence contract. The generic B/C fake provider remains a mechanism fixture, not subject to this DeepSeek-specific policy. The offline DeepSeek rehearsal enforces the same excerpt rule as the gated client; its generic engine output does not retain the integrated-only fragmentBasis metadata.

The scene prompt requests a stable third-person fictional subject without invented gender or addressing the real user. This is prompt guidance, not a deterministic viewpoint validator or a tested guarantee of narrative quality.

On invalid wake content, the run fails with body-free `wake_fragment_not_grounded`, retains committed scenes and the conservative unknown-attempt hold, and publishes no wake or dream entry. It does not silently rewrite the fragment, issue a repair call or redispatch the ambiguous stage after reopen. A model may therefore incur cost without producing a completed dream. The existing money/call caps remain in force.

Protocol and budgeted-provider identities change for new requests. Existing completed results remain readable/replayable without regeneration and are not migrated or relabeled as grounded. Resuming older partial runs under a changed protocol conflicts instead of silently changing their contract.

## Verification and next gate

The regression probe failed on merged parent 75a9e8519d3550f9e8b689cd0f948fa687ec6d9e because invented aftermath was accepted as completed. After correction: **82 passed / 0 failed / 0 skipped** on Linux with LF files and separately in a temporary CRLF text checkout. Evidence and source hashes: `validation/wake-grounding.json` and linked TAP output. Tests cover accepted Chinese excerpts, forged evidence, seed-only text, paraphrase/combined/new-event rejection, independent residue/associations, no publication on invalid wake, retained accounting, reopened refusal without a fourth call, and the offline-provider path. This is same-author review.

The new correction has not run on Windows or against DeepSeek. The original three-run/nine-call trial is complete. Next: review/merge decision and Windows offline tests. Any new paid trial needs a separate approved allowance and explicit cumulative accounting; do not delete or enlarge the completed trial. No private materials or Asteria integration are authorized.

# Engines: what was taken from each upstream

Three projects, three channels, three licences. This package reimplements their
*contracts* in new code; it does not vendor their source. That choice is
deliberate and it has costs, both listed here.

## dsh-genui — MIT — ★802

**Its channel:** a ```dsh-ui fenced JSON tree (layout, text, table, chart,
echart, plot, mermaid, diagram, scene3d, forms, quiz), rendered by a React
renderer that observes the transcript DOM; buttons relay `[genui-action]` back
through the scoped conversation send; a bundled `genui` skill teaches the
component schema; `validate_dsh_ui` checks a spec before send.

**What this package took:**

- The idea of a declarative spec with a closed component vocabulary
  (`chart`, `cards`, `slides`, `design` are JSON, not markup).
- The action loop: `[artifact-action] …` + artifact id + "update with the same
  id", so a button press is a normal next turn rather than special plumbing.
- A bundled skill as the long-form contract, with the prompt carrying only the
  invariants.
- Validation before send: every rejection lists all errors at once.

**What it did not take:** the React component tree, the 1 MB icon table, the
ECharts/mermaid/three bundles, the panel dock, achievements. Those are good
answers to *interactive widget* problems; here the equivalent is an HTML
fragment in a sandboxed frame, which is a smaller surface and needs no bundle.

**Compatibility:** you can run both plugins side by side. They register
different tool names (`artifact` vs `render_ui`) and different fence languages
(`dsh-artifact` vs `dsh-ui`), so nothing collides. The cost is two prompt
sections.

## dsh-visualize — BSD-3-Clause — ★323

**Its channel:** a `visualize` tool that takes an inline HTML *fragment*,
validates it (no document skeleton, no `position:fixed`, CDN allowlist), stores
it, and renders it in `<iframe sandbox="allow-scripts">` with the frame's own
CSP. Streams a preview into the composer dock, patches cards with exact
`old_str`/`new_str` pairs, keeps per-card state, resolves images from the
workspace into the frame, offers `inline | wide | page`.

**What this package took:**

- The fragment contract, including the two rules that catch most broken cards:
  no document skeleton, no `position:fixed`.
- The sandboxed frame plus per-document CSP as the security boundary.
- `inline | wide | page` as surfaces, and the "page opens in its own tab"
  posture.
- Exact-string patching is *not* implemented; `update` resends the source. For
  a 2 MB ceiling, resending is simpler and cannot silently patch the wrong
  site. This is a deliberate regression in token cost, stated plainly.

**Not taken:** the composer-dock streaming preview (the toolview renders on
settle), image resolution from the workspace, the style-file editor.

**Compatibility:** different tool name (`artifact` vs `visualize`), different
fence language, so both can coexist.

## dsh-generative-ui — Apache-2.0 — ★75

**Its channel:** the model writes TSX; the browser compiles it with a wasm
esbuild (`@esm.sh/tsx`) every frame as it streams, so a card renders while its
JSX is still unclosed. Inline or in a side canvas. The host serves capability
routes (`$dsh/fs`, `$dsh/exec`, `$dsh/web`, `$dsh/ai`) that generated code may
call under the session's own sandbox policy, and a card that fails reports
itself back as runtime context so the model can fix it.

**What this package took:**

- The side-canvas surface (`surface:"canvas"`), used for decks and design
  boards.
- The failure loop's *shape*: a bad artifact is reported to the model with the
  reason, not silently swallowed. Validation errors are actionable text.
- The capability honesty rule: the prompt only lists what the host actually
  mounted.

**Not taken:** the in-browser compiler, the capability routes, the import-map
machinery, `allowExec`. A compiler is a large dependency and a large attack
surface; `widget` + `page` cover the same output with markup. Generated code
calling the filesystem or a shell is a policy decision this package declines to
make on the user's behalf.

**Compatibility:** different tool name, different fence language; it can run
alongside, at the cost of a second prompt section and a second canvas surface.

## Why not one vendored tree

The three projects total tens of thousands of lines, three React trees, four
bundlers and a wasm compiler. A vendored merge would ship all of that to add
slides, design and OOXML — and it would make every upstream bug a local bug.
The protocol merge keeps the useful contracts, drops the duplicated runtimes,
and makes the new surface (artifacts with ids, exports, a gallery) possible
without forking anybody's renderer.

If you want the original channels verbatim, install the originals. They are
good. This package is for the case where you want *one* surface, Claude-shaped,
with decks and files in it.

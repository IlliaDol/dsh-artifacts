# Parity with Claude artifacts

What matches, what is a reasonable substitute, and what is missing. Written to
be read before trusting a claim in the README.

## Matches

| Claude behaviour | Here |
| --- | --- |
| Inline widget rendered in the message, no file, no link | `widget`, `chart`, `cards`, rendered by the toolview |
| Widgets can be downloaded | `Export → html` |
| Static and dynamic inline widgets | same; `dshArtifact.send` is the action channel |
| A button can send a message back into the chat | `dshArtifact.send` → `conversation.send` |
| Published HTML page with its own URL | `page` + `view?id=` (harness-local URL) |
| Slide deck, 16:9, page through, download | `slides`, arrow keys, `PDF` button, `pptx` export |
| Design canvas of artboards | `design`, pannable/zoomable, sandboxed boards |
| Editable docs, export to Word/PDF/Markdown | `doc`, `docx`/print/`md` exports |
| Downloadable Word/Excel/PowerPoint/PDF/CSV | `export` and `file` |
| Native line/bar/scatter charts | `chart` |
| Native cards (recipe, itinerary, quiz, steps, comparison, …) | `cards` |
| Strict design system, sentence case, 400/500 weights, no gradients | token sheet + prompt + skill |
| CSS theme variables that follow light/dark | `--text`, `--surface`, … plus `data-theme` flips from the host |
| CDN allowlist, self-contained files, size caps | CSP + 2 MB cap + allowlist validation |
| Missing facts become placeholders, never invented | stated in prompt and skill |

## Substitutes, with the trade

| Claude | Here | Trade |
| --- | --- | --- |
| Hosted private link | `view?id=` on the harness webserver | Not shareable outside the machine; no auth token in the URL |
| Artifact picker / gallery UI inside the chat | `/plugins/dsh-artifacts/gallery` | Another tab, not a chat panel |
| Streaming render while the model types | Renders when the tool call settles; fences render when the fence closes | No partial widget; a half-written JSON spec is never shown |
| React/TSX artifacts | `widget`/`page` with markup | No hooks, no npm imports inside the artifact |
| Native chart interactivity (zoom, brush) | Chart.js hover tooltips | No zoom/brush |
| PDF generated server-side | Browser print dialog | Pagination follows print CSS; no headless PDF engine |
| Editable in-place docs | Source is editable via `update`; no rich-text editor | Round-trips are text |
| Slides with images, notes, transitions | Text layouts; `image` accepts `data:` URIs only | No speaker notes export, no transitions |

## Missing

| Capability | Why |
| --- | --- |
| Public hosting / sharing links | Needs a hosting service and an auth model this package does not own |
| Shared data between viewers, presence | Needs a server-side store and identity |
| Calling the model from inside an artifact | Deliberate: the action bridge goes through a user turn, so it is visible and cancellable |
| Live TSX compilation | Would pull a wasm compiler and its import map into the package |
| Image generation / stock library | Not present in the harness profile |
| Excel formulas and charts | The XLSX writer emits values, not formulas |
| PPTX images, notes, transitions | The writer emits text boxes only |
| DOCX images, columns, custom styles | Same reason |

## Security differences worth naming

- Claude's published pages run on Anthropic's origin with a reviewed CSP. Here
  the CSP is shipped by this plugin and the frame is `sandbox="allow-scripts"`.
  It is strong (no same-origin, no top navigation, no forms to the host) but it
  is *our* policy, not an audited platform one.
- Cards can message the model. That message is attributed to the session that
  owns the frame; a frame with no known session is silent. There is no ambient
  "current session" fallback, because guessing would let a stale tab speak into
  the wrong conversation.
- `$DSH_HOME/artifacts` is readable by anything running as the user. Treat an
  artifact as a file on disk, not as a secret store.

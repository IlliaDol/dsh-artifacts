# Architecture

## Two halves, one row

dsh mounts one plugin row. The row names the package; `package.json` tells the
harness that it has both halves:

```json
"dsh": {
  "bundle": { "patch": "./cordis.patch.yml" },
  "client": { "inject": [], "platform": "web" }
}
```

- **Node half** (`lib/index.js`, `main`): registers the prompt section, the
  `artifact` tool, the bundled skill, and the HTTP routes.
- **Browser half** (`lib/client.js`, exported at `./client`): served by
  `@deepseek-ai/dsh-client-modules` at `/plugins/dsh-artifacts/client.js`, in
  the module-loader envelope:

  ```js
  window.__ModuleLoader__.load({ id: 'dsh-artifacts', factory: (require) => { … } })
  ```

The envelope is written by hand, so there is no bundler, no `tsdown`, no `dist`
step: what is in `lib/` is what runs.

## Store

```
$DSH_HOME/artifacts/
  index.json                  newest-first records
  exports/                    downloaded files
  art_1a2b3c4d5e/
    meta.json                 id, kind, title, surface, timestamps, byte count
    source.json|md|html       the model's own source
    index.html                the rendered document
```

Writes are serialized through one promise chain per process and land through a
temp file plus `rename`, so two concurrent tool calls cannot interleave into a
half-written index. A missing or corrupt `index.json` is rebuilt by scanning
`meta.json` files.

## Rendering

`lib/render.js` maps an envelope to a self-contained document:

| Kind | Renderer |
| --- | --- |
| `widget` | fragment in the shared shell; `<svg>` gets a centred wrapper |
| `chart` | the bundled kit (`kit/charts.js`, embedded as `lib/kit.js`): SVG marks, pointer interaction, accessible fallback table |
| `cards` | one of ten layouts, quiz scoring in-page |
| `page` | the document as given, or a fragment in the page shell |
| `slides` | 1280×720 stage, scale-to-fit, keyboard + print CSS |
| `design` | absolutely placed artboards, each in a sandboxed iframe |
| `doc` | Markdown → typographic reading surface, A4 print CSS |
| `file` | no document; the export path writes the bytes |

Every document carries `BRIDGE_SCRIPT` (`lib/theme.js`): height reporting,
theme flips, `dshArtifact.send/prompt/open/state`. It is inert when the
document is opened as a standalone tab.

## Routes

| Route | Purpose |
| --- | --- |
| `GET /plugins/dsh-artifacts/view?id=` | rendered document, artifact CSP |
| `GET /plugins/dsh-artifacts/source?id=` | the stored source, plain text |
| `GET /plugins/dsh-artifacts/export?id=&format=` | attachment in one of eight formats |
| `GET /plugins/dsh-artifacts/gallery` | index of every artifact |

`ARTIFACT_CSP` is `default-src 'none'` plus the asset allowlist. There is no
`frame-src` to the harness, no `connect-src` to the harness, and form
submission is disabled.

## Client

Two channels:

1. **Toolview** — `ctx.slots.register({ name: 'tool.call.toolview', key: 'artifact' }, Card)`.
   The card reads `presentationMeta`, mounts the view URL in a sandboxed iframe,
   and sizes it from the frame's height messages. If the host moves the meta
   carrier, `readMeta` walks the plausible props and degrades to the generic
   tool row rather than throwing.
2. **Fence** — a MutationObserver over the transcript finds
   `pre > code.language-dsh-artifact` blocks whose body is `{"id":"art_…"}`,
   mounts a frame beside the block and hides the code. This is the placement
   channel: the card under the tool call already shows the artifact, the fence
   says "put it here, between these paragraphs".

Actions arrive by `postMessage`, are attributed to the frame that sent them, and
become a message in that session's conversation:

```
[artifact-action] adopt {…}
Artifact: art_1a2b3c4d5e (Q3 review).
The artifact stays rendered; update it with action:"update" and the same id …
```

No action is trusted from an unknown `event.source`.

## Exports

`lib/zip.js` writes stored (uncompressed) ZIP entries with deterministic
timestamps and CRCs. `lib/ooxml.js` builds the minimum part sets for
WordprocessingML, PresentationML and SpreadsheetML. No dependencies.

PDF is not generated: `format:"pdf"` returns the rendered document with a print
call, so pagination follows the CSS the viewer already ships.

## Failure modes

- A rejected artifact throws before anything is written; the message lists
  every validation error at once.
- A render failure is a 500 with the reason, not a blank frame.
- A missing client half degrades to the tool's text result and the viewer link.
- A host without `webServer` keeps the tool and the skill; only the links are
  useless there.

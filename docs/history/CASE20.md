# Case20 — 17 September 2026

- Expanded career card uses a fixed layout box and transform morph. Content cancels the scale. Retargeted spring preserves velocity.
- Soft 115px scroll-aware top mask; the corner arrow follows the rendered glass corner.
- Background blur is composed before glass in WebGL; no separate rectangular backdrop cutout.
- Glass frost uses a fixed sampling pattern throughout the morph, avoiding a quality switch near closure.
- Surface opacity reads are batched before style writes. Internal content and close control move by transforms rather than changing layout coordinates.
- River geometry uses static document coordinates. Layout is deferred while a career card is reparented into a popup.

Validation: desktop + mobile open/close, title sizing, no horizontal overflow, no JS/shader errors. Three repeated Voodoo open/close cycles retained identical river knots (experimental-qa/case20-river.json). User recording reviewed as a contact sheet in experimental-qa/case20-video.jpg.

Performance caveat: headless Chrome measurements vary; opening still has occasional slow frames. After batching reads, measured p95 was 41.8ms opening and 33.3ms closing, versus 66.6/54.2ms in the initial sample. This is not a guarantee of constant 60fps on the user's GPU.

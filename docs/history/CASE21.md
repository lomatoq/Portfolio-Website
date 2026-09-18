# Case21

Reviewed recording 20260917-0000-15.2148043.mp4 as frames at 0.15s intervals around opening.

Root cause of neighbor/river order changes: a details.exp element was replaced by a div placeholder, changing nth-of-type parity of every following career card. Placeholder now preserves the source tag type. Static river coordinates and deferred relayout from case20 remain.

The original career-play element now remains visible and travels with the surface, rotating its existing icon. The separate inline close control is hidden. Clicking the original control closes the same surface.

Morph frequency reduced from 14 to 8 rad/s, damping .84, settlement window 1.7s. Animation clock caps a single advance at 1/30s so a stalled frame cannot skip the trajectory. Retargets preserve velocity.

Career navigation duration floor 1800ms. Position curve t-sin(2*pi*t)/(2*pi), zero velocity and acceleration at both endpoints. Existing velocity carry preserved. Checkpoint measurements deferred while a case is detached.

Validation: case21-identity.json confirms same button node, all neighbors retain offsetLeft, click closes, no page errors. case21-results.json confirms stable river points and no shader errors. Frame progress maximum observed .109, not a constant-frame-rate guarantee.

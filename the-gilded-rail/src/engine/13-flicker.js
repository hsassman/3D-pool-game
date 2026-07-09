/* The Gilded Rail - FAULTY WIRING (disabled)
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= FAULTY WIRING ================= */
/* the lamps used to stutter/power-cut every few minutes; the room now stays
   lit at a constant level. Kept as a no-op (rather than deleted outright) so
   22-loop.js's Flicker.update(dt) call and flickerLights stay valid. */
const Flicker = {
  active:null,
  update(dt){}
};

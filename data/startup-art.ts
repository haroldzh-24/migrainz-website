// ARTWORK PLACEHOLDER: paste your final original Japanese AA portrait here.
// Priority: readable anime girl > human face > helmet > tactical cues.
// Head or head-and-shoulders: obvious bangs, framing hair, large eyes, small
// nose/mouth and a feminine/chibi face. No mask, robot or skull geometry.
// Keep gear simple: helmet above bangs, side ear pads and a flipped-UP mount.
// Gear labels live outside the portrait in StartupSequence, not in the face.
// Preserve all spaces. Use the same line count and alignment in both frames;
// change ONLY the eye region in eyesClosed. Do not reflow or trim individual lines.
// Keep the closing backtick on its own line if the art ends in a backslash.
export const STARTUP_ART_PLACEHOLDER = String.raw`
    [ JAPANESE AA PORTRAIT / ARTWORK PENDING ]

          Original character file missing.
          Please insert one tactical girl.
`;

export const STARTUP_ART = {
  isPlaceholder: true,
  eyesOpen: STARTUP_ART_PLACEHOLDER,
  eyesClosed: STARTUP_ART_PLACEHOLDER,
};

// Set isPlaceholder to false after supplying both frames. The identical
// placeholders deliberately show no substitute face or pretend eye animation.

// The actual mark engraved on our bars — kept simple on purpose, matching
// the real stamp: a script "Electro Refined" over tracked-caps "SILVER",
// framed by a thin rule rather than a full seal/emblem.
export default function ElectroRefinedMark({ size = 1, className = "" }) {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6 * size,
        padding: `${18 * size}px ${28 * size}px`,
        border: "1px solid var(--ink-line)",
      }}
    >
      <span
        style={{
          fontFamily: "'Brush Script MT', cursive",
          fontStyle: "italic",
          fontSize: 26 * size,
          color: "var(--gold-bright)",
          lineHeight: 1,
        }}
      >
        Electro Refined
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 15 * size,
          letterSpacing: `${4 * size}px`,
          color: "var(--ivory)",
        }}
      >
        SILVER
      </span>
    </div>
  );
}

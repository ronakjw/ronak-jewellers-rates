export default function HallmarkSeal({ size = 220, className = "" }) {
  const id = "hallmark-ring";

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Ronak Jewellers hallmark: NR, Electro Refined Silver"
    >
      <defs>
        <path id={id} d="M 100,100 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0" />
        <linearGradient id="hs-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e6c34f" />
          <stop offset="55%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#8a6f1a" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="96" fill="none" stroke="#2a2b2f" strokeWidth="1" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="url(#hs-metal)" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="62" fill="none" stroke="#2a2b2f" strokeWidth="1" />

      <text fontFamily="var(--font-mono), monospace" fontSize="9.5" letterSpacing="3.2" fill="#c7cbd1">
        <textPath href={`#${id}`} startOffset="2%">
          ELECTRO REFINED SILVER &#8226; RONAK REFINE CUTTERS &amp; MELTERS &#8226;
        </textPath>
      </text>

      <text
        x="100"
        y="94"
        textAnchor="middle"
        fontFamily="var(--font-display), sans-serif"
        fontWeight="800"
        fontSize="46"
        fill="url(#hs-metal)"
      >
        NR
      </text>
      <text
        x="100"
        y="118"
        textAnchor="middle"
        fontFamily="var(--font-mono), monospace"
        fontSize="9"
        letterSpacing="2"
        fill="#8a8d93"
      >
        999 FINE
      </text>
    </svg>
  );
}

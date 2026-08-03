import Link from "next/link";
import HallmarkSeal from "./HallmarkSeal";

export default function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--ink-line)", padding: "64px 0 32px" }}>
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 1fr",
            gap: 40,
            marginBottom: 48,
          }}
          className="footer-grid"
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 22,
                marginBottom: 12,
              }}
            >
              RONAK <span style={{ color: "var(--gold)" }}>JEWELLERS</span>
            </div>
            <p style={{ maxWidth: 320, fontSize: 14 }}>
              Silver & Gold bullion, traded at live rates and refined in-house
              by Ronak Refine Cutters and Melters — marked 'Electro Refined Silver'.
            </p>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Office</div>
            <p style={{ fontSize: 14 }}>
              64, Bada Sarafa, Alankar Market, Indore(MP) - 452002
              <br />
              0731-2503012
            </p>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Refinery</div>
            <p style={{ fontSize: 14 }}>
              31 Lodhipura, near Malganj, Indore (MP) - 452002
              <br />
             +91-9893893898
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid var(--ink-line)",
            paddingTop: 24,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <Link href="/" style={{ fontSize: 13, textDecoration: "none", color: "var(--silver)" }}>Home</Link>
            <Link href="/about" style={{ fontSize: 13, textDecoration: "none", color: "var(--silver)" }}>About</Link>
            <Link href="/products" style={{ fontSize: 13, textDecoration: "none", color: "var(--silver)" }}>Products & Services</Link>
            <Link href="/contact" style={{ fontSize: 13, textDecoration: "none", color: "var(--silver)" }}>Contact</Link>
            <Link href="/rates" style={{ fontSize: 13, textDecoration: "none", color: "var(--gold-bright)" }}>Live Rates</Link>
          </div>
          <HallmarkSeal size={48} />
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

import Link from "next/link";
import Image from "next/image";
import SiteNav from "./components/SiteNav";
import SiteFooter from "./components/SiteFooter";
import ElectroRefinedMark from "./components/ElectroRefinedMark";

export default function HomePage() {
  return (
    <div className="site">
      <SiteNav />

      {/* Hero */}
      <section className="container" style={{ paddingTop: 72, paddingBottom: 72 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.3fr 0.9fr",
            gap: 48,
            alignItems: "center",
          }}
          className="hero-grid"
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 18 }}>
              Gold &amp; Silver Bullion
            </div>
            <h2>
              Traded and Refined
              <br />
              under One <span style={{ color: "var(--gold)" }}>Mark.</span>
            </h2>
            <p className="lede" style={{ marginTop: 24 }}>
              Ronak Jewellers trades silver and gold and at live,
              commodity-linked* rates. Every bar we sell is refined, assayed and minted
                by our team of experts at our refinery — that&apos;s the Rounak Refined Silver mark (previously, Electro Refined Silver) you&apos;ll find engraved on each silver bar. 
                Equipped with a team of highly committed experts and state of art refining, smelting, assaying, and minting equipment, our company is managed professionally with qualified workforce and a clear vision. 
                We provide the best training and facilities to our highly professional and technical staff
            </p>
            <div style={{ display: "flex", gap: 16, marginTop: 36, flexWrap: "wrap" }}>
              <Link href="/rates" className="btn btn-gold">
                View Rates
              </Link>
              <Link href="/about" className="btn btn-line">
                Our Refinery
              </Link>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <ElectroRefinedMark size={1.4} />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section style={{ borderTop: "1px solid var(--ink-line)", borderBottom: "1px solid var(--ink-line)" }}>
        <div
          className="container"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "24px 48px",
            padding: "28px 24px",
          }}
        >
          {[
            "Refining",
            "Smelting",
            "Assaying",
            "Minting",
            "Bar Cutting",
            "Trading and Investment",
          ].map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 6, height: 6, background: "var(--gold)", display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--silver)" }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Two businesses, one story */}
      <section className="section">
        <div className="container">
          <div className="grid-2" style={{ alignItems: "center", marginBottom: 64 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Ronak Jewellers</div>
              <h2>Bullion, priced live.</h2>
              <p style={{ marginTop: 16, maxWidth: 46 + "ch" }}>
                We trade gold and silver bullion with rates linked directly to
                live MCX pricing, so what you see is what the market says —
                plus a transparent, fixed premium. Dealers can check live buy
                and sell rates any time.
              </p>
              <Link href="/rates" className="btn btn-line" style={{ marginTop: 24 }}>
                Check Today&apos;s Rates
              </Link>
            </div>
            <div
              style={{
                position: "relative",
                aspectRatio: "5 / 4",
                border: "1px solid var(--ink-line)",
                overflow: "hidden",
              }}
            >
              <Image
                src="/shopfront.png"
                alt="Ronak Jewellers"
                fill
                style={{ objectFit: "cover" }}
                sizes="(max-width: 860px) 100vw, 50vw"
              />
            </div>
          </div>

          <div className="grid-2" style={{ alignItems: "center" }}>
            <div
              style={{
                position: "relative",
                aspectRatio: "5 / 4",
                border: "1px solid var(--ink-line)",
                overflow: "hidden",
              }}
            >
              <Image
                src="/refinery-furnace.jpeg"
                alt="Ronak Refine Cutters and Melters furnace"
                fill
                style={{ objectFit: "cover" }}
                sizes="(max-width: 860px) 100vw, 50vw"
              />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Ronak Refine Cutters &amp; Melters</div>
              <h2>Refined under our own roof.</h2>
              <p style={{ marginTop: 16, maxWidth: 46 + "ch" }}>
                Behind Ronak Jewellers is our own refining operation — known
                to old clients by our family initials, NR. Raw silver is
                melted, assayed, cast, and precision-cut on site, then stamped with
                the Rounak Refined Silver mark before it ever reaches a
                customer. Our customer base includes all the traders, investors, jewellers, and collectors. 
              </p>
              <Link href="/about" className="btn btn-line" style={{ marginTop: 24 }}>
                See The Process
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="section section--tight" style={{ textAlign: "center" }}>
        <div className="container">
          <h2 style={{ marginBottom: 20 }}>Rates move all day. So do we.</h2>
          <p className="lede" style={{ margin: "0 auto 32px" }}>
            Live gold and silver rates, updated continuously, with our
            premium already applied — no guesswork.
          </p>
          <Link href="/rates" className="btn btn-gold">
            Open Live Rates
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

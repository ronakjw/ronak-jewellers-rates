import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import HallmarkSeal from "../components/HallmarkSeal";
import PlaceholderMedia from "../components/PlaceholderMedia";

export const metadata = {
  title: "About | Ronak Jewellers & Ronak Refine Cutters and Melters",
  description:
    "Ronak Jewellers trades gold and silver bullion. Ronak Refine Cutters and Melters (NR) refines and cuts every bar in-house, marked Electro Refined Silver.",
};

const PROCESS = [
  {
    step: "01",
    title: "Raw silver in",
    body: "Silver arrives at the refinery in raw form, weighed and logged before it enters the furnace.",
  },
  {
    step: "02",
    title: "Melted",
    body: "The furnace brings it to a full melt, burning off impurities to reach fineness.",
  },
  {
    step: "03",
    title: "Cast & cut",
    body: "Molten silver is cast and precision-cut into bars and ingots on site.",
  },
  {
    step: "04",
    title: "Marked",
    body: "Each finished bar is stamped with the Electro Refined Silver mark — our name on our work.",
  },
];

export default function AboutPage() {
  return (
    <div className="site">
      <SiteNav />

      <section className="container" style={{ paddingTop: 72, paddingBottom: 40 }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>About</div>
        <h1>One name clients know. Two crafts behind it.</h1>
        <p className="lede" style={{ marginTop: 24 }}>
          Most clients know us simply as Ronak Jewellers — or by our family
          initials, NR. What they&apos;re really dealing with is two things
          working as one: a bullion trading house, and the refinery that
          makes what it sells.
        </p>
      </section>

      <section className="section">
        <div className="container grid-2" style={{ alignItems: "center" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Ronak Jewellers</div>
            <h2>The trading house.</h2>
            <p style={{ marginTop: 16 }}>
              Ronak Jewellers is the side of the business clients deal with
              day to day — buying and selling gold and silver bullion at
              rates linked live to the market, with a clear, fixed premium
              on top. No surprises between the screen and the counter.
            </p>
          </div>
          <PlaceholderMedia label="Trading counter / rate board" ratio="5 / 4" />
        </div>
      </section>

      <section className="section">
        <div className="container grid-2" style={{ alignItems: "center" }}>
          <PlaceholderMedia label="Furnace / molten silver being poured" ratio="5 / 4" />
          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Ronak Refine Cutters &amp; Melters</div>
            <h2>The refinery, under our own roof.</h2>
            <p style={{ marginTop: 16 }}>
              Fewer clients know this side by name, but it&apos;s where the
              actual work happens — old-fashioned labour, done in-house.
              Raw silver is melted, cast, and cut into bars and ingots on
              site, under the Ronak Refine Cutters and Melters name that
              carries our family&apos;s initials, NR.
            </p>
          </div>
        </div>
      </section>

      {/* Hallmark story */}
      <section className="section" style={{ background: "var(--ink)" }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.8fr 1.2fr",
              gap: 48,
              alignItems: "center",
              marginBottom: 56,
            }}
            className="hero-grid"
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <HallmarkSeal size={200} />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>The Mark</div>
              <h2>Electro Refined Silver.</h2>
              <p style={{ marginTop: 16, maxWidth: "56ch" }}>
                If you&apos;ve held one of our bars, you&apos;ve likely seen
                it — the Electro Refined Silver mark, engraved on every piece
                that leaves the refinery. It&apos;s not decoration. It&apos;s
                our signature on the fineness of the metal, and it&apos;s how
                generations of clients have recognised our work without
                needing to know either company name.
              </p>
            </div>
          </div>

          <div className="grid-3">
            {PROCESS.map((item) => (
              <div key={item.step} className="card">
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--gold)",
                    marginBottom: 14,
                  }}
                >
                  {item.step}
                </div>
                <h3 style={{ marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 14 }}>{item.body}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40 }}>
            <PlaceholderMedia
              label="Cutting process — close-up of the mark being stamped"
              tag="Video"
              ratio="21 / 9"
            />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

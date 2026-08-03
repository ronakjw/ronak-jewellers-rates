import Link from "next/link";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import PlaceholderMedia from "../components/PlaceholderMedia";

export const metadata = {
  title: "Products & Services | Ronak Jewellers",
  description:
    "Gold and silver bullion trading at live rates, plus in-house refining, casting, and custom cutting by Ronak Refine Cutters and Melters.",
};

const TRADE_ITEMS = [
  { name: "Gold Bullion", detail: "Traded at live, MCX-linked rates with a transparent premium." },
  { name: "Silver Bullion", detail: "999 and 999.9 fine, priced live throughout the trading day." },
];

const REFINE_ITEMS = [
  { name: "Silver Bars", detail: "Cast and cut in-house, stamped Electro Refined Silver." },
  { name: "Silver Ingots", detail: "Various weights, finished on site by Ronak Refine Cutters & Melters." },
  { name: "Custom Cutting & Melting", detail: "Labour work for dealers who bring their own material to refine." },
];

export default function ProductsPage() {
  return (
    <div className="site">
      <SiteNav />

      <section className="container" style={{ paddingTop: 72, paddingBottom: 40 }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>Products &amp; Services</div>
        <h1>What we trade. What we make.</h1>
        <p className="lede" style={{ marginTop: 24 }}>
          Two sides of one operation — bullion trading at live rates, and
          the refining work that produces what we sell.
        </p>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
            <h2>Bullion Trading</h2>
            <Link href="/rates" className="btn btn-line">View Live Rates</Link>
          </div>
          <div className="grid-2">
            {TRADE_ITEMS.map((item) => (
              <div key={item.name} className="card">
                <h3 style={{ marginBottom: 10 }}>{item.name}</h3>
                <p style={{ fontSize: 14 }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 style={{ marginBottom: 32 }}>Refining &amp; Manufacturing</h2>
          <div className="grid-2" style={{ alignItems: "center", marginBottom: 40 }}>
            <PlaceholderMedia label="Finished silver bars, stacked" ratio="5 / 4" />
            <PlaceholderMedia label="Cutting process in progress" tag="Video" ratio="5 / 4" />
          </div>
          <div className="grid-3">
            {REFINE_ITEMS.map((item) => (
              <div key={item.name} className="card">
                <h3 style={{ marginBottom: 10 }}>{item.name}</h3>
                <p style={{ fontSize: 14 }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight" style={{ textAlign: "center" }}>
        <div className="container">
          <h2 style={{ marginBottom: 20 }}>Have material to refine, or bullion to buy?</h2>
          <Link href="/contact" className="btn btn-gold">Get In Touch</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

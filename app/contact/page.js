import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";

export const metadata = {
  title: "Contact | Ronak Jewellers",
  description: "Reach Ronak Jewellers' trading office or the Ronak Refine Cutters and Melters refinery.",
};

export default function ContactPage() {
  return (
    <div className="site">
      <SiteNav />

      <section className="container" style={{ paddingTop: 72, paddingBottom: 40 }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>Contact</div>
        <h1>Two locations, one team.</h1>
        <p className="lede" style={{ marginTop: 24 }}>
          Trading, Investment and Refining happen at separate addresses — reach out to
          whichever one fits what you need.
        </p>
      </section>

      <section className="section">
        <div className="container grid-2">
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Ronak Jewellers — Office</div>
            <h3 style={{ marginBottom: 16 }}>For buying &amp; selling bullion</h3>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
              64, Bada Sarafa, Alankar Market,
              <br />
              Indore(MP) - 452002
            </p>
            <p style={{ fontSize: 14 }}>
              Landline: <a href="tel:" style={{ color: "var(--gold-bright)" }}>0731-2503012</a>
              <br />
            Mobile: <a href="tel:" style={{ color: "var(--gold-bright)" }}>+91-9479893898</a> | <a href="tel:" style={{ color: "var(--gold-bright)" }}>+91-9300053012</a>
              <br />
            
              Email: <a href="mailto:" style={{ color: "var(--gold-bright)" }}>admin@ronakjewellers.co.in</a>
            </p>
          </div>

          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Ronak Refine Cutters &amp; Melters — Refinery</div>
            <h3 style={{ marginBottom: 16 }}>For refining &amp; custom cutting</h3>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
              31 Lodhipura, near Malganj,
              <br />
             Indore (MP) - 452002
            </p>
            <p style={{ fontSize: 14 }}>
              Phone: <a href="tel:+91" style={{ color: "var(--gold-bright)" }}>9893893898</a>
             
            </p>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Hours</div>
          <p style={{ fontSize: 14 }}>Mon–Fri, 1:00 PM – 9:00 PM</p>
          <p style={{ fontSize: 14 }}>Sat, 2:00 PM – 8:00 PM</p>      
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

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
          Trading and refining happen at separate addresses — reach out to
          whichever one fits what you need.
        </p>
      </section>

      <section className="section">
        <div className="container grid-2">
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Ronak Jewellers — Trading Office</div>
            <h3 style={{ marginBottom: 16 }}>For buying &amp; selling bullion</h3>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
              [Add: trading office address]
              <br />
              [Add: city, PIN code]
            </p>
            <p style={{ fontSize: 14 }}>
              Phone: <a href="tel:+91" style={{ color: "var(--gold-bright)" }}>[Add: phone number]</a>
              <br />
              Email: <a href="mailto:" style={{ color: "var(--gold-bright)" }}>[Add: email address]</a>
            </p>
          </div>

          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Ronak Refine Cutters &amp; Melters — Refinery</div>
            <h3 style={{ marginBottom: 16 }}>For refining &amp; custom cutting</h3>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
              [Add: refinery address]
              <br />
              [Add: city, PIN code]
            </p>
            <p style={{ fontSize: 14 }}>
              Phone: <a href="tel:+91" style={{ color: "var(--gold-bright)" }}>[Add: phone number]</a>
              <br />
              Email: <a href="mailto:" style={{ color: "var(--gold-bright)" }}>[Add: email address]</a>
            </p>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Hours</div>
          <p style={{ fontSize: 14 }}>[Add: trading hours, e.g. Mon–Sat, 10:00 AM – 7:00 PM]</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

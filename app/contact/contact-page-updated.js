import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";

export const metadata = {
  title: "Contact | Ronak Jewellers",
  description: "Reach Ronak Jewellers' trading office or the Ronak Refine Cutters and Melters refinery.",
};

const fieldStyle = {
  width: "100%",
  padding: "13px 14px",
  border: "1px solid var(--border, #d6d6d6)",
  borderRadius: 6,
  background: "var(--surface, #fff)",
  color: "inherit",
  font: "inherit",
  fontSize: 14,
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: 8,
  fontSize: 14,
  fontWeight: 600,
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
              Indore (MP) - 452002
            </p>
            <p style={{ fontSize: 14 }}>
              Landline: <a href="tel:07312503012" style={{ color: "var(--gold-bright)" }}>0731-2503012</a>
              <br />
              Mobile: <a href="tel:+919479893898" style={{ color: "var(--gold-bright)" }}>+91-9479893898</a> | <a href="tel:+919300053012" style={{ color: "var(--gold-bright)" }}>+91-9300053012</a>
              <br />
              Email: <a href="mailto:admin@ronakjewellers.co.in" style={{ color: "var(--gold-bright)" }}>admin@ronakjewellers.co.in</a>
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
              Phone: <a href="tel:+919893893898" style={{ color: "var(--gold-bright)" }}>9893893898</a>
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="card" style={{ maxWidth: 760, margin: "0 auto" }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Get in touch</div>
            <h2 style={{ marginBottom: 12 }}>Send us a message</h2>
            <p style={{ fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
              Complete the form below and our team can follow up with you.
              Fields marked with * are required.
            </p>

            <form action="/contact" method="post">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 20 }}>
                <div>
                  <label htmlFor="contact-name" style={labelStyle}>Name *</label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your full name"
                    required
                    style={fieldStyle}
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" style={labelStyle}>Email *</label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    style={fieldStyle}
                  />
                </div>

                <div>
                  <label htmlFor="contact-phone" style={labelStyle}>Phone number</label>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91"
                    style={fieldStyle}
                  />
                </div>

                <div>
                  <label htmlFor="contact-subject" style={labelStyle}>Subject *</label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    placeholder="What is your enquiry about?"
                    required
                    style={fieldStyle}
                  />
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <label htmlFor="contact-message" style={labelStyle}>Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={6}
                  placeholder="Write your message here..."
                  style={{ ...fieldStyle, resize: "vertical", minHeight: 150 }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: 24,
                  padding: "13px 22px",
                  border: 0,
                  borderRadius: 6,
                  background: "var(--gold-bright, #c9a227)",
                  color: "#111",
                  font: "inherit",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Send message
              </button>
            </form>
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

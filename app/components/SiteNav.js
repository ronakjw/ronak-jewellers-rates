"use client";

import { useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/products", label: "Products & Services" },
  { href: "/contact", label: "Contact" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header
      style={{
        borderBottom: "1px solid var(--ink-line)",
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "rgba(11,12,14,0.86)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 76,
        }}
      >
        <Link
          href="/"
          style={{
            textDecoration: "none",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: "0.02em",
            color: "var(--ivory)",
          }}
        >
          RONAK <span style={{ color: "var(--gold)" }}>JEWELLERS</span>
        </Link>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
          className="site-nav-links"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                textDecoration: "none",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--silver)",
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/rates" className="btn btn-gold">
            Live Rates
          </Link>
        </nav>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="site-nav-toggle"
          style={{
            display: "none",
            background: "none",
            border: "1px solid var(--ink-line)",
            color: "var(--ivory)",
            padding: "8px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div
          className="site-nav-mobile"
          style={{
            borderTop: "1px solid var(--ink-line)",
            padding: "16px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{
                textDecoration: "none",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                textTransform: "uppercase",
                color: "var(--silver)",
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/rates" className="btn btn-gold" style={{ width: "fit-content" }}>
            Live Rates
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 760px) {
          .site-nav-links { display: none; }
          .site-nav-toggle { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}

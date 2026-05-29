"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SystemPage() {
  const [health, setHealth] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadStatus() {
    setLoading(true);

    try {
      const healthRes = await fetch("/api/health", {
        cache: "no-store",
      });

      const healthData = await healthRes.json();
      setHealth(healthData);

      const quoteRes = await fetch("/api/kite-quote", {
        cache: "no-store",
      });

      const quoteData = await quoteRes.json();
      setQuote(quoteData);
    } catch (err) {
      setHealth({
        website: "online",
        kite: false,
        error: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.brandMark}>RJ</div>
            <h1 style={styles.title}>System Status</h1>
            <p style={styles.subtitle}>Ronak Jewellers Live Rates</p>
          </div>

          <Link href="/admin" style={styles.backButton}>
            Back to Admin
          </Link>
        </div>

        <div style={styles.grid}>
          <StatusCard
            title="Website"
            value={health?.website === "online" ? "Online" : "Issue"}
            ok={health?.website === "online"}
          />

          <StatusCard
            title="Kite"
            value={health?.kite ? "Connected" : "Disconnected"}
            ok={Boolean(health?.kite)}
          />

          <StatusCard
            title="Contract"
            value={quote?.contract || health?.contract || "--"}
            ok={Boolean(quote?.contract || health?.contract)}
          />

          <StatusCard
            title="Mode"
            value={quote?.mode || "--"}
            ok={Boolean(quote?.mode)}
          />

          <StatusCard
            title="MCX Buy"
            value={
              quote?.mcxBuyPrice
                ? `₹${formatPrice(quote.mcxBuyPrice)}`
                : "--"
            }
            ok={Boolean(quote?.mcxBuyPrice)}
          />

          <StatusCard
            title="MCX Sell"
            value={
              quote?.mcxSellPrice
                ? `₹${formatPrice(quote.mcxSellPrice)}`
                : "--"
            }
            ok={Boolean(quote?.mcxSellPrice)}
          />

          <StatusCard
            title="Last Quote Time"
            value={quote?.timestamp || "--"}
            ok={Boolean(quote?.timestamp)}
          />

          <StatusCard
            title="Health Checked"
            value={health?.timestamp || "--"}
            ok={Boolean(health?.timestamp)}
          />
        </div>

        {health?.error ? (
          <div style={styles.errorBox}>{health.error}</div>
        ) : null}

        {quote?.message ? (
          <div style={styles.errorBox}>{quote.message}</div>
        ) : null}

        <button style={styles.refreshButton} onClick={loadStatus}>
          {loading ? "Checking..." : "Refresh Status"}
        </button>
      </section>
    </main>
  );
}

function StatusCard({ title, value, ok }) {
  return (
    <div style={styles.statusCard}>
      <p style={styles.label}>{title}</p>

      <div style={styles.statusRow}>
        <span
          style={{
            ...styles.dot,
            background: ok ? "#d6b45c" : "#9b2c2c",
            boxShadow: ok
              ? "0 0 12px rgba(214,180,92,0.8)"
              : "0 0 12px rgba(155,44,44,0.8)",
          }}
        />

        <h2 style={styles.value}>{value}</h2>
      </div>
    </div>
  );
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #2b2414 0%, #0d0d0d 38%, #050505 100%)",
    color: "#d6b45c",
    fontFamily: "Arial, Helvetica, sans-serif",
    padding: "24px 16px",
    boxSizing: "border-box",
  },

  card: {
    width: "100%",
    maxWidth: 980,
    margin: "0 auto",
    background:
      "linear-gradient(145deg, rgba(31,31,31,0.96), rgba(10,10,10,0.96))",
    border: "1px solid rgba(214,180,92,0.32)",
    borderRadius: 26,
    padding: 24,
    boxShadow: "0 26px 80px rgba(0,0,0,0.55)",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 24,
  },

  brandMark: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "1px solid rgba(214,180,92,0.65)",
    background: "linear-gradient(145deg, #1f1f1f, #060606)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    color: "#f3d98b",
    marginBottom: 12,
  },

  title: {
    margin: 0,
    color: "#f3d98b",
    fontSize: "clamp(30px, 6vw, 44px)",
    letterSpacing: "0.03em",
  },

  subtitle: {
    marginTop: 8,
    color: "#9f9f9f",
  },

  backButton: {
    textDecoration: "none",
    border: "1px solid rgba(214,180,92,0.35)",
    background: "rgba(214,180,92,0.08)",
    color: "#f3d98b",
    borderRadius: 12,
    padding: "10px 14px",
    whiteSpace: "nowrap",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },

  statusCard: {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
  },

  label: {
    margin: "0 0 10px",
    color: "#9f9f9f",
    fontSize: 13,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },

  value: {
    margin: 0,
    color: "#f3d98b",
    fontSize: 20,
    wordBreak: "break-word",
  },

  errorBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    color: "#ffd6d6",
    background: "rgba(120, 20, 20, 0.35)",
    border: "1px solid rgba(255, 120, 120, 0.25)",
  },

  refreshButton: {
    width: "100%",
    marginTop: 22,
    border: "1px solid rgba(214,180,92,0.55)",
    background:
      "linear-gradient(145deg, rgba(214,180,92,0.28), rgba(35,35,35,0.92))",
    color: "#f3d98b",
    borderRadius: 16,
    padding: "16px 22px",
    fontSize: 18,
    fontWeight: 800,
    cursor: "pointer",
  },
};

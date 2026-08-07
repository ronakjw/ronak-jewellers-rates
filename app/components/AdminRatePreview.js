"use client";

import { useEffect, useState, Fragment } from "react";
import { buildCompactRateRows, compactMoney, compactPremium } from "../lib/pricing";

const REFRESH_MS = 5000;

const styles = {
  wrap: {
    marginTop: 12,
    border: "1px solid #3a3323",
    borderRadius: 10,
    overflow: "hidden",
    background: "#141210",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderBottom: "1px solid #3a3323",
    background: "#1c1913",
  },
  title: {
    color: "#f3d98b",
    fontWeight: 700,
    fontSize: 14,
  },
  liveDot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#5fd17a",
    marginRight: 6,
  },
  meta: {
    color: "#8a8578",
    fontSize: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: "#f3d98b",
    textAlign: "center",
  },
  th: {
    padding: "7px 4px",
    borderBottom: "1.5px solid #3a3323",
    color: "#c9a227",
    fontSize: 12,
    fontWeight: 800,
    textAlign: "center",
  },
  productCell: {
    padding: "7px 4px",
    fontSize: 13,
    fontWeight: 800,
    verticalAlign: "middle",
    borderTop: "1.5px solid #3a3323",
  },
  sideCell: {
    padding: "6px 4px",
    fontSize: 12,
    fontWeight: 600,
    color: "#c9c4b4",
  },
  td: {
    padding: "6px 4px",
    fontSize: 13,
    color: "#e8e3d6",
  },
  finalTd: {
    padding: "6px 4px",
    fontSize: 14,
    fontWeight: 800,
    color: "#5fd17a",
  },
  empty: {
    padding: "20px 14px",
    color: "#8a8578",
    fontSize: 13,
    textAlign: "center",
  },
};

// Live preview of the compact rates table used on the public rates page,
// computed from the *draft* settings passed in — so editing a premium field
// updates this instantly, before you've clicked Save. Fetches live MCX
// prices on its own short interval; doesn't touch anything else.
//
// Note: the pricing math here comes from ../lib/pricing.js, which is a copy
// of the same logic in app/rates/page.js. If that logic ever changes, keep
// both in sync (or refactor rates/page.js to import from the shared module
// too — ask if you want that done).
export default function AdminRatePreview({ settings }) {
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchQuote() {
      try {
        const res = await fetch("/api/quote", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;

        if (!data.success) {
          setError(data.message || "Unable to fetch live rate");
          return;
        }
        setError("");
        setQuote(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to fetch live rate");
      }
    }

    fetchQuote();
    const interval = setInterval(fetchQuote, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const rows = settings && quote ? buildCompactRateRows(quote, settings) : [];

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.title}>
          <span style={styles.liveDot} />
          Live Preview
        </span>
        <span style={styles.meta}>
          {quote?.activeProvider ? `via ${quote.activeProvider}` : ""}
        </span>
      </div>

      {error && !quote ? (
        <div style={styles.empty}>{error}</div>
      ) : !rows.length ? (
        <div style={styles.empty}>Waiting for live rate…</div>
      ) : (
        <table style={styles.table}>
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "24%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={styles.th}>Product</th>
              <th style={styles.th}></th>
              <th style={styles.th}>MCX</th>
              <th style={styles.th}>Premium</th>
              <th style={styles.th}>Final</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr>
                  <td style={styles.productCell} rowSpan={2}>
                    {row.compactTitle}
                  </td>
                  <td style={{ ...styles.sideCell, borderTop: "1.5px solid #3a3323" }}>Buy</td>
                  <td style={{ ...styles.td, borderTop: "1.5px solid #3a3323" }}>{compactMoney(row.mcxBuy)}</td>
                  <td style={{ ...styles.td, borderTop: "1.5px solid #3a3323" }}>{compactPremium(row.buyPremium)}</td>
                  <td style={{ ...styles.finalTd, borderTop: "1.5px solid #3a3323" }}>{compactMoney(row.finalBuying)}</td>
                </tr>
                <tr>
                  <td style={styles.sideCell}>Sell</td>
                  <td style={styles.td}>{compactMoney(row.mcxSell)}</td>
                  <td style={styles.td}>{compactPremium(row.sellPremium)}</td>
                  <td style={styles.finalTd}>{compactMoney(row.finalSelling)}</td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import Image from "next/image";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

const db = getFirestore(app);

function formatPrice(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en-IN").format(value);
}

function formatPremium(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}₹${formatPrice(value)}`;
}

export default function Home() {
  const [settings, setSettings] = useState(null);
  const [quote, setQuote] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "bullion"),
      (snapshot) => {
        setSettings(snapshot.data());
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    const clock = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(clock);
  }, []);

  const marketState = useMemo(() => {
    if (!settings) {
      return {
        withinMarketHours: false,
        shouldShowRates: false,
        refreshMs: 7000,
      };
    }

    const hour = now.getHours();
    const minute = now.getMinutes();

    const currentMinutes = hour * 60 + minute;
    const startMinutes = (settings.marketStartHour ?? 12) * 60;
    const endMinutes = (settings.marketEndHour ?? 21) * 60;

    const after530 = currentMinutes >= 17 * 60 + 30;

    return {
      withinMarketHours:
        currentMinutes >= startMinutes &&
        currentMinutes < endMinutes,
      shouldShowRates:
        Boolean(settings.showRates) &&
        currentMinutes >= startMinutes &&
        currentMinutes < endMinutes,
      refreshMs:
        after530
          ? (settings.refreshAfter530 || 2) * 1000
          : (settings.refreshBefore530 || 7) * 1000,
    };
  }, [settings, now]);

  useEffect(() => {
    if (!settings || !marketState.shouldShowRates) {
      return;
    }

    async function fetchQuote() {
      try {
        setFetchError("");

        const res = await fetch("/api/kite-quote", {
          cache: "no-store",
        });

        const data = await res.json();

        if (!data.success) {
          setFetchError(data.message || "Unable to fetch MCX rate");
          return;
        }

        setQuote(data);
      } catch (err) {
        setFetchError(
        err?.message ||
        "Unable to connect to live rate server");
      }
    }

    fetchQuote();

    const interval = setInterval(fetchQuote, marketState.refreshMs);

    return () => clearInterval(interval);
  }, [settings, marketState.shouldShowRates, marketState.refreshMs]);

  if (!settings) {
    return <LoadingScreen />;
  }

  if (!marketState.shouldShowRates) {
    return <ClosedScreen />;
  }

 if (!quote) {
  return (
    <main style={styles.pageCenter}>
      <Image   src="/logo.png"   alt="Ronak Jewellers"   width={200}   height={231}   style={{     marginBottom: 20,   }} />

      <h1 style={styles.brandName}>
        Ronak Jewellers
      </h1>

      <div style={styles.closedCard}>
        <h2 style={styles.closedTitle}>
          Live rates are loading...
        </h2>

        <p style={styles.muted}>
         You can also call for current bullion rates.
        </p>

        <div style={styles.contactWrap}>
          <a
            href="tel:9479893898"
            style={styles.callButton}
          >
            📞 9479893898
          </a>

          <a
            href="tel:9300053012"
            style={styles.callButton}
          >
            📞 9300053012
          </a>
        </div>
      </div>
    </main>
  );
}

  const buyingPremium = Number(settings.buyingPremium || 0);
  const sellingPremium = Number(settings.sellingPremium || 0);

  const finalBuying = quote.mcxBuyPrice + buyingPremium;
  const finalSelling = quote.mcxSellPrice + sellingPremium;

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <Image   src="/logo.png"   alt="Ronak Jewellers"   width={250}   height={289}   style={{     marginBottom: 20,   }} />

        <h2 style={styles.brandName}>- Ronak Jewellers -</h2>

        <div style={styles.statusRow}>
          <span style={styles.liveDot} />
          <span>LIVE MCX SILVER FUTURES</span>
        </div>
      </section>

      <section style={styles.mainCard}>
        <div style={styles.cardTop}>
          <div>
            <p style={styles.label}>Contract</p>
            <h2 style={styles.contract}>{quote.contract}</h2>
          </div>

          <div style={styles.badge}>
            {marketState.refreshMs / 1000}s Refresh
          </div>
        </div>

        {fetchError ? (
          <div style={styles.errorBox}>{fetchError}</div>
        ) : null}

        <div style={styles.rateGrid}>
          <div style={styles.sideCard}>
            <p style={styles.label}>MCX Buy Price</p>
            <h2 style={styles.mcxPrice}>
              ₹{formatPrice(quote.mcxBuyPrice)}
              <span style={styles.unit}> / kg</span>
            </h2>

            <div style={styles.premiumBox}>
              <span>Buying Premium</span>
              <strong>{formatPremium(buyingPremium)}</strong>
            </div>

            <p style={styles.finalLabel}>Final Buying Rate</p>
            <h1 style={styles.finalPrice}>
              ₹{formatPrice(finalBuying)}
              <span style={styles.unit}> / kg</span>
            </h1>
          </div>

          <div style={styles.sideCard}>
            <p style={styles.label}>MCX Sell Price</p>
            <h2 style={styles.mcxPrice}>
              ₹{formatPrice(quote.mcxSellPrice)}
              <span style={styles.unit}> / kg</span>
            </h2>

            <div style={styles.premiumBox}>
              <span>Selling Premium</span>
              <strong>{formatPremium(sellingPremium)}</strong>
            </div>

            <p style={styles.finalLabel}>Final Selling Rate</p>
            <h1 style={styles.finalPrice}>
              ₹{formatPrice(finalSelling)}
              <span style={styles.unit}> / kg</span>
            </h1>
          </div>
        </div>

        <div style={styles.metaRow}>
          <span>Last Updated: {quote.timestamp}</span>
          <span>Source: Kite Connect</span>
        </div>
      </section>
 {settings.kachhiBadlaEnabled ? (
  <div style={styles.kachhiBox}>
    <h2><span>Kachhi Badla Rate</span></h2>
    <strong><h1>
      {settings.kachhiBadlaUnit === "Rs/kg"
        ? `₹${formatPrice(settings.kachhiBadlaValue)} / kg`
        : `${formatPrice(settings.kachhiBadlaValue)} gm/kg`}
</h1></strong>
  </div>
) : null}               

      <section style={styles.contactWrap}>
        <a href="tel:9479893898" style={styles.callButton}>
          📞 9479893898
        </a>

        <a href="tel:9300053012" style={styles.callButton}>
          📞 9300053012
        </a>
            </section>
                <p
    style={{
    marginTop: 26,
    color: "#8f8f8f",
    fontSize: 13,
    textAlign: "center",
    maxWidth: 800,
    lineHeight: 1.7,
    marginLeft: "auto",
    marginRight: "auto",
    padding: "0 12px",
  }}
>
  Rates displayed are based on live MCX market prices and
  applicable premiums. Final rates may vary depending on
  market conditions and confirmation at the time of enquiry.
</p>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main style={styles.pageCenter}>
      <Image   src="/logo.png"   alt="Ronak Jewellers"   width={250}   height={289}   style={{     marginBottom: 20,   }} />
      <h1 style={styles.brandName}>Ronak Jewellers</h1>
      <p style={styles.muted}>Loading live bullion rates...</p>
    </main>
  );
}

function ClosedScreen() {
  return (
    <main style={styles.pageCenter}>
      <Image   src="/logo.png"   alt="Ronak Jewellers"   width={120}   height={139}   style={{     marginBottom: 20,   }} />

      <h1 style={styles.brandName}>Ronak Jewellers</h1>

      <div style={styles.closedCard}>
        <h2 style={styles.closedTitle}>
          Please call for current bullion rates.
        </h2>

        <p style={styles.muted}>
          Live rates are currently unavailable.
        </p>

        <div style={styles.contactWrap}>
          <a href="tel:9479893898" style={styles.callButton}>
            📞 9479893898
          </a>

          <a href="tel:9300053012" style={styles.callButton}>
            📞 9300053012
          </a>
        </div>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #2b2414 0%, #0d0d0d 38%, #050505 100%)",
    color: "#d6b45c",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    padding: "28px 18px 40px",
    boxSizing: "border-box",
  },

  pageCenter: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #2b2414 0%, #0d0d0d 38%, #050505 100%)",
    color: "#d6b45c",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    padding: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    textAlign: "center",
    boxSizing: "border-box",
  },

  hero: {
    textAlign: "center",
    marginBottom: 28,
  },

  brandName: {
    margin: 0,
    fontSize: "clamp(34px, 7vw, 58px)",
    letterSpacing: "0.04em",
    color: "#f3d98b",
    textShadow: "0 0 22px rgba(214,180,92,0.16)",
  },

  statusRow: {
    marginTop: 14,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "#9f9f9f",
    fontSize: 12,
    letterSpacing: "0.18em",
  },
kachhiBox: {
  margin: "28px auto 0",
  maxWidth: 520,
  border: "1px solid rgba(214,180,92,0.38)",
  background:
    "linear-gradient(145deg, rgba(214,180,92,0.16), rgba(35,35,35,0.92))",
  color: "#f3d98b",
  borderRadius: 16,
  padding: "15px 22px",
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
  fontSize: 16,
  fontWeight: 700,
},
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#d6b45c",
    boxShadow: "0 0 12px #d6b45c",
  },

  mainCard: {
    width: "100%",
    maxWidth: 920,
    margin: "0 auto",
    background:
      "linear-gradient(145deg, rgba(31,31,31,0.96), rgba(10,10,10,0.96))",
    border: "1px solid rgba(214,180,92,0.32)",
    borderRadius: 26,
    padding: "24px",
    boxShadow:
      "0 26px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
    boxSizing: "border-box",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "flex-start",
    marginBottom: 22,
  },

  label: {
    margin: "0 0 7px",
    color: "#9b9b9b",
    fontSize: 13,
    letterSpacing: "0.11em",
    textTransform: "uppercase",
  },

  contract: {
    margin: 0,
    color: "#f3d98b",
    fontSize: 22,
  },

  badge: {
    border: "1px solid rgba(214,180,92,0.34)",
    background: "rgba(214,180,92,0.08)",
    color: "#f3d98b",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 13,
    whiteSpace: "nowrap",
  },

  rateGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 18,
  },

  sideCard: {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 22,
    padding: 20,
  },

  mcxPrice: {
    margin: "0 0 18px",
    color: "#e8e8e8",
    fontSize: "clamp(28px, 6vw, 42px)",
  },

  unit: {
    fontSize: 15,
    color: "#9f9f9f",
    fontWeight: 400,
  },

  premiumBox: {
    margin: "18px 0 22px",
    border: "1px solid rgba(214,180,92,0.26)",
    background:
      "linear-gradient(90deg, rgba(214,180,92,0.12), rgba(214,180,92,0.035))",
    color: "#dcdcdc",
    borderRadius: 16,
    padding: "13px 15px",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
  },

  finalLabel: {
    color: "#9b9b9b",
    margin: "0 0 8px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontSize: 13,
  },

  finalPrice: {
    margin: 0,
    color: "#f3d98b",
    fontSize: "clamp(34px, 8vw, 54px)",
    lineHeight: 1,
  },

  metaRow: {
    marginTop: 22,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    paddingTop: 16,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    color: "#858585",
    fontSize: 13,
  },

  contactWrap: {
    marginTop: 28,
    display: "flex",
    justifyContent: "center",
    gap: 14,
    flexWrap: "wrap",
  },

  callButton: {
    textDecoration: "none",
    color: "#f3d98b",
    border: "1px solid rgba(214,180,92,0.45)",
    background:
      "linear-gradient(145deg, rgba(214,180,92,0.18), rgba(35,35,35,0.92))",
    boxShadow:
      "0 12px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
    padding: "14px 22px",
    borderRadius: 14,
    minWidth: 170,
    textAlign: "center",
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "0.03em",
  },

  closedCard: {
    width: "100%",
    maxWidth: 520,
    marginTop: 22,
    background:
      "linear-gradient(145deg, rgba(31,31,31,0.96), rgba(10,10,10,0.96))",
    border: "1px solid rgba(214,180,92,0.32)",
    borderRadius: 24,
    padding: 24,
    boxSizing: "border-box",
  },

  closedTitle: {
    color: "#f3d98b",
    marginTop: 0,
  },

  muted: {
    color: "#9f9f9f",
  },

  errorBox: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 14,
    color: "#ffd6d6",
    background: "rgba(120, 20, 20, 0.35)",
    border: "1px solid rgba(255, 120, 120, 0.25)",
  },
};

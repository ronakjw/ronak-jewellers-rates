"use client";

import { useEffect, useMemo, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import Image from "next/image";
import InstallPWAButton from "./components/InstallPWAButton";
import "./global.css";

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
function ContactButtons() {
  return (
    <section style={styles.contactWrap}>
      <a href="tel:9479893898" style={styles.callButton}>
        📞 9479893898
      </a>
      <a href="tel:9300053012" style={styles.callButton}>
        📞 9300053012
      </a>
    </section>
  );
}
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
  return `${sign}${formatPrice(value)}`;
}

function formatCurrentTime(date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
// Auto premium function starts
function getAutoPremium(basePremium, currentMcx, openingMcx, settings) {
  if (!settings.autoPremiumEnabled) {
    return Number(basePremium || 0);
  }
  const stepSize = Number(settings.premiumStepSize || 1000);
  const adjustment = Number(settings.premiumStepAdjustment || 500);
  const difference = currentMcx - openingMcx;
  const steps = Math.trunc(difference / stepSize);
  return Number(basePremium || 0) - steps * adjustment;
}
function roundToNearest500(value) {
  return Math.floor((value + 249) / 500) * 500;
}

function roundDownToMultiple(value, multiple) {
  const amount = Number(value);
  const roundBy = Math.max(1, Number(multiple || 1));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.floor(amount / roundBy) * roundBy;
}

function roundUpToMultiple(value, multiple) {
  const amount = Number(value);
  const roundBy = Math.max(1, Number(multiple || 1));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.ceil(amount / roundBy) * roundBy;
}

function ProductPanel({
  id,
  title,
  openProducts,
  setOpenProducts,
  children,
}) {
  const isOpen = openProducts[id];

  return (
<section style={styles.productPanel}>
   <button
        type="button"
        style={{
          ...styles.productToggle,
          borderBottom: isOpen
            ? "1px solid rgba(214,180,92,0.22)"
            : "none",
          borderRadius: isOpen ? "16px 16px 0 0" : 16,
        }}
        onClick={() =>
          setOpenProducts((prev) => ({
            ...prev,
            [id]: !prev[id],
          }))
        }
      >
           <span>{title}</span>
<span
  style={{
    transition: "transform 0.25s ease",
    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
  }}>
  {isOpen ? "−" : "+"}
</span>
</button>

 <div
  style={{
    ...styles.productPanelBody,
    maxHeight: isOpen ? 1000 : 0,
    opacity: isOpen ? 1 : 0,
    padding: isOpen ? 18 : "0 18px",
  }}>
  {children}
</div>
    </section>
  );
}

function MarketMeta({ opening, closing}) {
  return (
   
      <div style={styles.metaItem}>
        <p>Opening : {formatPrice(opening)} | Closing : {formatPrice(closing)} </p>
      </div>
   
  );
}

export default function Home() {
  const [settings, setSettings] = useState(null);
  const [quote, setQuote] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [now, setNow] = useState(new Date());
  const [priceHistory, setPriceHistory] = useState([]);
  const [volatilityUntil, setVolatilityUntil] = useState(null);
 const [openProducts, setOpenProducts] = useState({
  silver99: true,
  silver100: false,
  gold995: false,
});
  
function CustomNotice({ message }) {
  if (!message?.trim()) {
    return null;
  }
  return (
    <div style={styles.statusRow}>
      {" "}
      <span>{message.trim()}</span>
    </div>
  );
}

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
        const currentBuyPrice = Number(data.mcxBuyPrice || 0);

if (currentBuyPrice) {
  setPriceHistory((prev) => {
    const now = Date.now();

    const updated = [
      ...prev,
      {
        price: currentBuyPrice,
        time: now,
      },
    ].filter((item) => now - item.time <= 40000);

    if (updated.length > 1) {
      const prices = updated.map((item) => item.price);

      const highest = Math.max(...prices);
      const lowest = Math.min(...prices);

      const isVolatile = highest - lowest >= 500;

      if (isVolatile) {
        setVolatilityUntil(now + 10 * 60 * 1000);
      }
    }

    return updated;
  });
}
      } 
      catch (err) {
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
  if (settings?.holidayMode) {
  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <Image src="/logo.png"  alt="Ronak Jewellers"   width={250}  height={250}  style={{ marginBottom: 12 }} />

        <h1 style={styles.brandName}>•Ronak Jewellers•</h1>

   {settings.noticeMessage?.trim() ? (
  <div style={styles.statusRow}>
  <div style={{ marginTop: 16 }}>  <span style={styles.liveDot} />
     </div> <CustomNotice message={settings.noticeMessage} />
  </div>
) : null}

    </section>


      <section style={styles.mainCard}>
        <div style={styles.rateGrid}>
          <div style={styles.sideCard}>
    
            <p style={styles.finalLabel}>Final Buying Rate</p>
            <h1 style={styles.finalPrice}>
              ₹{formatPrice(settings.holidayBuyingRate)}
              <span style={styles.unit}> / kg</span>
            </h1>
          </div>

          <div style={styles.sideCard}>
            <p style={styles.finalLabel}>Final Selling Rate</p>
            <h1 style={styles.finalPrice}>
              ₹{formatPrice(settings.holidaySellingRate)}
              <span style={styles.unit}> / kg</span>
            </h1>
          </div>
        </div>

{quote?.mcxClosingRate ? (
  <div style={styles.holidayClosingBox}>
    <p style={styles.finalLabel}>
      Previous Closing
    </p>

    <h2 style={styles.mcxPrice}>
      ₹{formatPrice(quote.mcxClosingRate)}
      <span style={styles.unit}>/kg</span>
    </h2>
  </div>
) : null}
  </section>
<KachhiBadla settings={settings} />
<ContactButtons />
<InstallPWAButton />
  <p style={styles.disclaimer}> Rates displayed are based on market conditions and applicable premiums. 
                Final rates may vary depending on confirmation at the time of enquiry. </p>
</main>
);
}

  if (!marketState.shouldShowRates) {
    return <ClosedScreen />;
  }

 if (!quote) {
  return (
    <main style={styles.pageCenter}>
      <Image   src="/logo.png"   alt="Ronak Jewellers"   width={250}   height={250}   style={{     marginBottom: 12,   }} />

      <h1 style={styles.brandName}>
       - Ronak Jewellers -
      </h1>

      <div style={styles.closedCard}>
        <h2 style={styles.closedTitle}>
        WELCOME
        </h2>

        <p style={styles.muted}>
        Loading Rates... Please Wait...
        </p>
<ContactButtons />
   </div>
    </main>
  );
}

const buyingPremium = getAutoPremium(
  settings.buyingPremium,
  quote.mcxBuyPrice,
  quote.mcxOpeningRate,
  settings );

const sellingPremium = getAutoPremium(
  settings.sellingPremium,
  quote.mcxSellPrice,
  quote.mcxOpeningRate,
  settings );

const rawFinalBuying = quote.mcxBuyPrice + buyingPremium;
const rawFinalSelling = quote.mcxSellPrice + sellingPremium;

const finalBuying = settings.showPremium
  ? rawFinalBuying
  : roundToNearest500(rawFinalBuying);

const finalSelling = settings.showPremium
  ? rawFinalSelling
  : roundToNearest500(rawFinalSelling);

const silver100BuyPremium = Number(settings.silver100buy || 0);
const silver100SellPremium = Number(settings.silver100sell || 0);

const silver100Buying = finalBuying + silver100BuyPremium;
const silver100Selling = finalSelling + silver100SellPremium;

const goldBuyPremium = Number(settings.GoldBuyPrem || 0);
const goldSellPremium = Number(settings.GoldSellPrem || 0);
const goldRoundoffMultiple = Math.max(
  1,
  Number(settings.GoldRoundoffMultiple || 100)
);

const rawGoldFinalBuying =
  quote.goldMcxBuyPrice === null || quote.goldMcxBuyPrice === undefined
    ? null
    : Number(quote.goldMcxBuyPrice) + goldBuyPremium;

const rawGoldFinalSelling =
  quote.goldMcxSellPrice === null || quote.goldMcxSellPrice === undefined
    ? null
    : Number(quote.goldMcxSellPrice) + goldSellPremium;

const goldFinalBuying = roundDownToMultiple(
  rawGoldFinalBuying,
  goldRoundoffMultiple
);

const goldFinalSelling = roundUpToMultiple(
  rawGoldFinalSelling,
  goldRoundoffMultiple
);
  
return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <Image   src="/logo.png"   alt="Ronak Jewellers"   width={250}   height={250}   style={{     marginBottom: 12,   }} />

        <h2 style={styles.brandName}>•Ronak Jewellers•</h2>

        <div style={styles.statusRow}>
          <span style={styles.live} />
          <span>LIVE MCX BULLION FUTURES</span>
        </div>
     <p>  <CustomNotice message={settings.noticeMessage} /> </p>
    </section>

{settings.volatilityWarningEnabled &&
volatilityUntil &&
Date.now() < volatilityUntil ? (
  <div style={styles.volatilityWarning}>
    <strong>⚠️  MARKET VOLATILITY ALERT!  ⚠️ </strong>
    <br />
    Please call us before making any Trade.
  </div>
) : null}

<div style={styles.disclaimer}>
  <span>Last Updated: {formatCurrentTime(now)}</span>
</div>

<ProductPanel
  id="silver99"
  title="SILVER 99 [SA Chorsa]"
  openProducts={openProducts}
  setOpenProducts={setOpenProducts}
>
    <div style={styles.rateGrid}>
          <div style={styles.sideCard}>
            <p style={styles.label}>MCX Buy</p>
            <h2 style={styles.mcxPrice}>
              ₹ {formatPrice(quote.mcxBuyPrice)}
              <span style={styles.unit}> / kg</span>
            </h2>

          {settings.showPremium ? (
            <div style={styles.premiumBox}>
              <span>Buying Premium :</span>
              <strong>{formatPremium(buyingPremium)}</strong>
            </div>
            ) : null}

            <p style={styles.finalLabel}>We Buy at :</p>
            <h1 style={styles.finalPrice}>
              ₹ {formatPrice(finalBuying)}
              <span style={styles.unit}> / kg</span>
            </h1>
          </div>

          <div style={styles.sideCard}>
            <p style={styles.label}>MCX Sell</p>
            <h2 style={styles.mcxPrice}>
              ₹ {formatPrice(quote.mcxSellPrice)}
              <span style={styles.unit}> /kg</span>
            </h2>

            {settings.showPremium ? (
                <div style={styles.premiumBox}>
              <span>Selling Premium :</span>
              <strong>{formatPremium(sellingPremium)}</strong>
            </div>
            ) : null}

            <p style={styles.finalLabel}>We Sell at :</p>
            <h1 style={styles.finalPrice}>
              ₹ {formatPrice(finalSelling)}
              <span style={styles.unit}> /kg</span>
            </h1>
          </div>
        </div>
    <MarketMeta
      opening={quote.mcxOpeningRate}
      closing={quote.mcxClosingRate}
    />
</ProductPanel>

{settings.silver100rate ? (
  <>
  <ProductPanel
  id="silver100"
  title="SILVER 100 [PetiCut]"
  openProducts={openProducts}
  setOpenProducts={setOpenProducts}
>
  <div style={styles.rateGrid}>
    <div style={styles.sideCard}>
      <p style={styles.label}>MCX Buy</p>
      <h2 style={styles.mcxPrice}>
        ₹ {formatPrice(quote.mcxBuyPrice)}
        <span style={styles.unit}> /kg</span>
      </h2>   

      <p style={styles.finalLabel}>WE BUY AT:</p>
      <h1 style={styles.finalPrice}>
        ₹ {formatPrice(silver100Buying)}
        <span style={styles.unit}> /kg</span>
      </h1>
    </div>

    <div style={styles.sideCard}>
      <p style={styles.label}>MCX Sell</p>
      <h2 style={styles.mcxPrice}>
        ₹ {formatPrice(quote.mcxSellPrice)}
        <span style={styles.unit}> /kg</span>
      </h2>

      <p style={styles.finalLabel}>WE SELL AT:</p>
      <h1 style={styles.finalPrice}>
        ₹ {formatPrice(silver100Selling)}
        <span style={styles.unit}> /kg</span>
      </h1>
    </div>
  </div>
  <MarketMeta
    opening={quote.mcxOpeningRate}
    closing={quote.mcxClosingRate}
  />
</ProductPanel>
  </>
) : null}
{Boolean(settings.ShowGoldRate) ? (
<ProductPanel
  id="gold995"
  title="GOLD 995"
  openProducts={openProducts}
  setOpenProducts={setOpenProducts}
>
  {quote.goldError ? (
    <p style={styles.metaRow}>
      Gold quote unavailable: {quote.goldError}
    </p>
  ) : (
    <>
    <div style={styles.rateGrid}>
      <div style={styles.sideCard}>
        <p style={styles.label}>MCX Buy</p>
        <h2 style={styles.mcxPrice}>
          ₹ {formatPrice(quote.goldMcxBuyPrice)}
          <span style={styles.unit}> / 10 gm</span>
        </h2>

        {settings.ShowGoldPrem ? (
          <div style={styles.premiumBox}>
            <span>Buying Premium :</span>
            <strong>{formatPremium(goldBuyPremium)}</strong>
          </div>
        ) : null}

        <p style={styles.finalLabel}>We Buy at :</p>
        <h1 style={styles.finalPrice}>
          ₹ {formatPrice(goldFinalBuying)}
          <span style={styles.unit}> / 10 gm</span>
        </h1>
      </div>

      <div style={styles.sideCard}>
        <p style={styles.label}>MCX Sell</p>
        <h2 style={styles.mcxPrice}>
          ₹ {formatPrice(quote.goldMcxSellPrice)}
          <span style={styles.unit}> / 10 gm</span>
        </h2>

        {settings.ShowGoldPrem ? (
          <div style={styles.premiumBox}>
            <span>Selling Premium :</span>
            <strong>{formatPremium(goldSellPremium)}</strong>
          </div>
        ) : null}

        <p style={styles.finalLabel}>We Sell at :</p>
        <h1 style={styles.finalPrice}>
          ₹ {formatPrice(goldFinalSelling)}
          <span style={styles.unit}> / 10 gm</span>
        </h1>
      </div>
    </div>
    </>
  )}
    <MarketMeta
      opening={quote.goldOpeningRate}
      closing={quote.goldClosingRate}
    />
</ProductPanel>
) : null}    
<KachhiBadla settings={settings} />
 <ContactButtons />
 <InstallPWAButton />               
  <p style={styles.disclaimer}> Rates displayed are based on market conditions and applicable premiums.
                Final rates may vary depending on confirmation at the time of enquiry. </p>
    </main>
  );
}

function KachhiBadla({ settings }) {
  if (!settings.kachhiBadlaEnabled) return null;
  return (
    <div style={styles.kachhiBox}>
      <span>Kachhi Badla Rate : </span>

      <div style={styles.kachhiValue}>
        {settings.kachhiBadlaUnit === "Rs/kg"
          ? `₹${formatPrice(settings.kachhiBadlaValue)} / kg`
          : `${formatPrice(settings.kachhiBadlaValue)} gm/kg`}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main style={styles.pageCenter}>
      <Image   src="/logo.png"   alt="Ronak Jewellers"   width={250}   height={250}   style={{     marginBottom: 20,   }} />
      <h1 style={styles.brandName}>Ronak Jewellers</h1>
      <p style={styles.muted}>Loading live bullion rates...</p>
    </main>
  );
}

function ClosedScreen() {
  return (
    <main style={styles.pageCenter}>
      <Image   src="/logo.png"   alt="Ronak Jewellers"   width={250}   height={250}   style={{     marginBottom: 20,   }} />
      <h1 style={styles.brandName}>• Ronak Jewellers •</h1>
      <div style={styles.closedCard}>
        <h2 style={styles.closedTitle}>
          Live rates are unavailable at the moment
        </h2>
        <p style={styles.muted}>
         Please visit again during market hours.
        </p>
      </div>
  <InstallPWAButton />
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
  kachhiValue: {
    fontSize: 29,
    fontWeight: 600,
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
productPanel: {
  width: "100%",
  maxWidth: 760,
  margin: "14px auto",
  border: "2px solid rgba(214,180,92,0.35)",
  borderRadius: 12,
  overflow: "hidden",
  background:
    "linear-gradient(145deg, rgba(214,180,92,0.10), rgba(20,20,20,0.94))",
},
productToggle: {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "#f3d98b",
  padding: "12px 15px",
  fontSize: 17,
  fontWeight: 450,
  letterSpacing: "0.18em",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
},
productPanelBody: {
  padding: 14,
  transition: "max-height 0.35s ease, opacity 0.25s ease, padding 0.35s ease",
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
  
statusRow: {
  marginTop: 16,
  color: "#9a9a9a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
},
live: {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#d6b45c",
  boxShadow: "0 0 12px #d6b45c",
  display: "inline-block",
  animation: "pulse 1.4s infinite",
},
liveDot: {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#d6b45c",
  boxShadow: "0 0 12px #d6b45c",
  display: "inline-block",
  verticalAlign: "middle",

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
  
disclaimer: {
    marginTop: 26,
    color: "#8f8f8f",
    fontSize: 13,
    textAlign: "center",
    maxWidth: 800,
    lineHeight: 1.7,
    marginLeft: "auto",
    marginRight: "auto",
    padding: "0 12px",
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
    transition: "transform 0.25s ease, box-shadow 0.25s ease",
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
    margin: "11px 0 15px",
    border: "1px solid rgba(214,180,92,0.26)",
    background:
      "linear-gradient(90deg, rgba(214,180,92,0.12), rgba(214,180,92,0.035))",
    color: "#dcdcdc",
    borderRadius: 7,
    padding: "9px 11px",
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
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
  display: "flex",
  justifyContent: "center",
  marginBottom: 12,
  color: "#9f9f9f",
  },
 
metaItem: {
  border: "1px solid rgba(214,180,92,0.22)",
  background: "rgba(214,180,92,0.055)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#cfcfcf",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  textAlign: "center",
},
volatilityWarning: {
  maxWidth: 760,
  margin: "0 auto 22px",
  border: "1px solid rgba(255, 193, 7, 0.45)",
  background:
    "linear-gradient(145deg, rgba(255,193,7,0.16), rgba(35,35,35,0.92))",
  color: "#f3d98b",
  borderRadius: 5,
  padding: "9px 11px",
  textAlign: "center",
  fontSize: 14,
  lineHeight: 1.5,
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
mcxReference: {
  margin: "18px auto 0",
  color: "#8f8f8f",
  fontSize: 13,
  textAlign: "center",
  display: "flex",
  justifyContent: "center",
  gap: 10,
  flexWrap: "wrap",
},

referenceDivider: {
  color: "#555",
},

holidayClosingBox: {
  margin: "22px auto 0",
  width: "100%",
  maxWidth: 500,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
  border: "1px solid rgba(214,180,92,0.32)",
  borderRadius: 22,
  padding: 20,
  textAlign: "center",
  boxSizing: "border-box",
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

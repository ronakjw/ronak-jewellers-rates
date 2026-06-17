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

const themeTokens = {
  dark: {
    "--rj-page-bg":
      "radial-gradient(circle at top, #2b2414 0%, #0d0d0d 38%, #050505 100%)",
    "--rj-text": "#d6b45c",
    "--rj-brand": "#f3d98b",
    "--rj-brand-shadow": "0 0 22px rgba(214,180,92,0.16)",
    "--rj-muted": "#9f9f9f",
    "--rj-label": "#9b9b9b",
    "--rj-price": "#e8e8e8",
    "--rj-final": "#f3d98b",
    "--rj-panel-bg":
      "linear-gradient(145deg, rgba(214,180,92,0.10), rgba(20,20,20,0.94))",
    "--rj-panel-border": "rgba(214,180,92,0.35)",
    "--rj-card-bg":
      "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
    "--rj-card-border": "rgba(255,255,255,0.08)",
    "--rj-main-card-bg":
      "linear-gradient(145deg, rgba(31,31,31,0.96), rgba(10,10,10,0.96))",
    "--rj-main-card-border": "rgba(214,180,92,0.32)",
    "--rj-premium-bg":
      "linear-gradient(90deg, rgba(214,180,92,0.12), rgba(214,180,92,0.035))",
    "--rj-premium-text": "#dcdcdc",
    "--rj-call-bg":
      "linear-gradient(145deg, rgba(214,180,92,0.18), rgba(35,35,35,0.92))",
    "--rj-call-shadow":
      "0 12px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
    "--rj-toggle-bg": "rgba(214,180,92,0.16)",
    "--rj-toggle-thumb": "linear-gradient(145deg, #f3d98b, #a87b24)",
    "--rj-soft-shadow": "0 26px 80px rgba(0,0,0,0.55)",
  },
  light: {
    "--rj-page-bg":
      "radial-gradient(circle at top, #fff7de 0%, #FFEABE 45%, #f2cb7b 100%)",
    "--rj-text": "#5a3600",
    "--rj-brand": "#3f2600",
    "--rj-brand-shadow": "0 2px 14px rgba(122,77,0,0.16)",
    "--rj-muted": "#745b31",
    "--rj-label": "#806236",
    "--rj-price": "#2f2413",
    "--rj-final": "#946100",
    "--rj-panel-bg":"#FFF6E0",
    "--rj-panel-border": "rgba(128,81,0,0.36)",
    "--rj-card-bg": "linear-gradient(145deg, rgba(255,255,255,0.58), rgba(255,234,190,0.82))",
    "--rj-card-border": "rgba(128,81,0,0.15)",
    "--rj-main-card-bg":
      "linear-gradient(145deg, rgba(255,255,255,0.64), rgba(255,234,190,0.86))",
    "--rj-main-card-border": "rgba(128,81,0,0.25)",
    "--rj-premium-bg":
      "linear-gradient(90deg, rgba(148,97,0,0.14), rgba(255,255,255,0.42))",
    "--rj-premium-text": "#4b3514",
    "--rj-call-bg":
      "linear-gradient(145deg, rgba(255,250,235,0.88), rgba(255,218,143,0.78))",
    "--rj-call-shadow":
      "0 12px 30px rgba(125,77,0,0.18), inset 0 1px 0 rgba(255,255,255,0.55)",
    "--rj-toggle-bg": "rgba(255,255,255,0.58)",
    "--rj-toggle-thumb": "linear-gradient(145deg, #ffffff, #f2b53b)",
    "--rj-soft-shadow": "0 22px 60px rgba(128,81,0,0.16)",
  },
};

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
  const base = Number(basePremium || 0);

  if (!settings.autoPremiumEnabled) {
    return base;
  }

  const current = Number(currentMcx);
  const opening = Number(openingMcx);
  const stepSize = Math.max(1, Number(settings.premiumStepSize || 1000));
  const adjustment = Number(settings.premiumStepAdjustment || 500);

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(opening) ||
    current <= 0 ||
    opening <= 0
  ) {
    return base;
  }

  const difference = current - opening;
  const steps = Math.trunc(difference / stepSize);

  return base - steps * adjustment;
}
function getGoldAutoPremium(
  basePremium,
  currentMcx,
  openingMcx,
  settings
) {
  const base = Number(basePremium || 0);

  if (!settings.GoldAutoPremiumEnabled) {
    return base;
  }

  const current = Number(currentMcx);
  const opening = Number(openingMcx);
  const stepSize = Math.max(1, Number(settings.GoldPremiumStepSize || 100));
  const adjustment = Number(settings.GoldPremiumStepAdjustment || 50);

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(opening) ||
    current <= 0 ||
    opening <= 0
  ) {
    return base;
  }

  const difference = current - opening;
  const steps = Math.trunc(difference / stepSize);

  return base - steps * adjustment;
}
function roundToNearest500(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.floor((amount + 249) / 500) * 500;
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
            ? "1px solid var(--rj-panel-border)"
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

function ThemeToggle({ theme, onToggle }) {
  const isLight = theme === "light";

  return (
    <div style={styles.themeToggleWrap}>
      <span style={styles.themeIcon}>🌙</span>
      <button
        type="button"
        aria-label="Change website theme"
        style={styles.themeSwitch}
        onClick={onToggle}
      >
        <span
          style={{
            ...styles.themeSwitchThumb,
            transform: isLight
              ? "translateX(34px) rotate(360deg)"
              : "translateX(0) rotate(0deg)",
          }}
        >
          {isLight ? "☀️" : "🌙"}
        </span>
      </button>
      <span style={styles.themeIcon}>☀️</span>
      <span style={styles.themeToggleText}>
        {isLight ? "Light" : "Dark"}
      </span>
    </div>
  );
}

function MarketMeta({ opening, closing}) {
  return (
   
      <div style={styles.metaItem}>
        <p>OPEN:{formatPrice(opening)}  |  CLOSE:{formatPrice(closing)} </p>
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
  const [theme, setTheme] = useState("dark");
 const [openProducts, setOpenProducts] = useState({
  silver99: true,
  silver100: false,
  gold995: false,
  goldHoliday: true,
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
    const savedTheme = window.localStorage.getItem("rj-theme");

    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.colorScheme =
      theme === "light" ? "light" : "dark";
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("rj-theme", nextTheme);
  }

  const logoSrc = theme === "light" ? "/logo-light.png" : "/logo.png";
  const pageStyle = {
    ...styles.page,
    ...themeTokens[theme],
  };
  const centerPageStyle = {
    ...styles.pageCenter,
    ...themeTokens[theme],
  };

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
    if (!settings || (!marketState.shouldShowRates && !settings.holidayMode)) {
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
  }, [settings, marketState.shouldShowRates, marketState.refreshMs, settings?.holidayMode]);

  if (!settings) {
      return <LoadingScreen theme={theme} logoSrc={logoSrc} />;
  }
  if (settings?.holidayMode) {
  return (
    <main style={pageStyle}>
      <section style={styles.hero}>
        <Image src={logoSrc}  alt="Ronak Jewellers"   width={250}  height={250}  style={styles.logoImage} />
        <h1 style={styles.brandName}>•Ronak Jewellers•</h1>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />

   {settings.noticeMessage?.trim() ? (
  <div style={styles.statusRow}>
  <div style={{ marginTop: 16 }}>  <span style={styles.liveDot} />
     </div> <CustomNotice message={settings.noticeMessage} />
  </div>
) : null}

    </section>

  {fetchError ? <div style={styles.errorBox}>{fetchError}</div> : null}
      
  <section style={styles.mainCard}>
       <div style={{ padding : '0px 20px' }}> <h2> S I L V E R - 9 9</h2></div> 
         <div style={styles.rateGrid}>
          <div style={styles.sideCard}>
    
            <p style={styles.finalLabel}>Buying Rate</p>
            <h1 style={styles.finalPrice}>
              ₹ {formatPrice(settings.holidayBuyingRate)}
              <span style={styles.unit}> / kg</span>
            </h1>
          </div>

          <div style={styles.sideCard}>
            <p style={styles.finalLabel}>Selling Rate</p>
            <h1 style={styles.finalPrice}>
              ₹ {formatPrice(settings.holidaySellingRate)}
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
      ₹ {formatPrice(quote.mcxClosingRate)}
      <span style={styles.unit}> /kg</span>
    </h2>
  </div>
) : null}
  </section>

{settings.showGoldHolidayRate ? (
  <section style={styles.mainCard}>
   <div style={{ padding : '0px 20px' }}> <h2> G O L D - 9 9 5 </h2> </div>
    <div style={styles.rateGrid}>
       <div style={styles.sideCard}>
        <p style={styles.finalLabel}>Buying Rate</p>
        <h1 style={styles.finalPrice}>
          ₹ {formatPrice(settings.goldHolidayBuyingRate)}
          <span style={styles.unit}> /10gm</span>
        </h1>
      </div>

      <div style={styles.sideCard}>
        <p style={styles.finalLabel}>Selling Rate</p>
        <h1 style={styles.finalPrice}>
          ₹ {formatPrice(settings.goldHolidaySellingRate)}
          <span style={styles.unit}> /10gm</span>
        </h1>
      </div>
    </div>

    {quote?.goldClosingRate ? (
      <div style={styles.holidayClosingBox}>
        <p style={styles.finalLabel}>
          Previous Closing
        </p>

        <h2 style={styles.mcxPrice}>
          ₹ {formatPrice(quote.goldClosingRate)}
          <span style={styles.unit}> /10gm</span>
        </h2>
      </div>
    ) : null}
  </section>
) : null}

<KachhiBadla settings={settings} />
<ContactButtons />
<InstallPWAButton />
  <p style={styles.disclaimer}> Rates displayed are based on market conditions and applicable premiums. 
                Final rates may vary depending on confirmation at the time of enquiry. </p>
</main>
);
}

  if (!marketState.shouldShowRates) {
    return <ClosedScreen theme={theme} logoSrc={logoSrc} />;
  }

 if (!quote) {
  return (
    <main style={centerPageStyle}>
      <Image   src={logoSrc}   alt="Ronak Jewellers"   width={250}   height={250}   style={styles.logoImage} />

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

const silverMcxBuy = Number(quote.mcxBuyPrice);
const silverMcxSell = Number(quote.mcxSellPrice);

const rawFinalBuying =
  Number.isFinite(silverMcxBuy) && silverMcxBuy > 0
    ? silverMcxBuy + buyingPremium
    : null;
const rawFinalSelling =
  Number.isFinite(silverMcxSell) && silverMcxSell > 0
    ? silverMcxSell + sellingPremium
    : null;

const finalBuying = settings.showPremium
  ? rawFinalBuying
  : roundToNearest500(rawFinalBuying);

const finalSelling = settings.showPremium
  ? rawFinalSelling
  : roundToNearest500(rawFinalSelling);

const silver100BuyPremium = Number(settings.silver100buy || 0);
const silver100SellPremium = Number(settings.silver100sell || 0);

const silver100Buying =
  finalBuying === null ? null : finalBuying + silver100BuyPremium;
const silver100Selling =
  finalSelling === null ? null : finalSelling + silver100SellPremium;

const goldBuyPremium = getGoldAutoPremium( settings.GoldBuyPrem, quote.goldMcxBuyPrice, quote.goldOpeningRate, settings);
const goldSellPremium = getGoldAutoPremium(settings.GoldSellPrem, quote.goldMcxSellPrice, quote.goldOpeningRate, settings);
const goldRoundoffMultiple = Math.max(1, Number(settings.GoldRoundoffMultiple || 100));
const goldMcxBuy = Number(quote.goldMcxBuyPrice);
const goldMcxSell = Number(quote.goldMcxSellPrice);

const rawGoldFinalBuying =
  Number.isFinite(goldMcxBuy) && goldMcxBuy > 0
    ? goldMcxBuy + goldBuyPremium
    : null;

const rawGoldFinalSelling =
  Number.isFinite(goldMcxSell) && goldMcxSell > 0
    ? goldMcxSell + goldSellPremium
    : null;
const goldFinalBuying = roundDownToMultiple(rawGoldFinalBuying, goldRoundoffMultiple);
const goldFinalSelling = roundUpToMultiple(rawGoldFinalSelling, goldRoundoffMultiple);

return (
    <main style={pageStyle}>
      <section style={styles.hero}>
        <Image   src={logoSrc}   alt="Ronak Jewellers"   width={250}   height={250}   style={styles.logoImage} />

        <h2 style={styles.brandName}>•Ronak Jewellers•</h2>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />

        <div style={styles.statusRow}>
          <span style={styles.live} />
          <span>LIVE MCX BULLION FUTURES</span>
        </div>
     <p>  <CustomNotice message={settings.noticeMessage} /> </p>
    </section>
  
<div style={styles.disclaimer}>
  <span>Last Updated: {formatCurrentTime(now)}</span>
</div>

{fetchError ? <div style={styles.errorBox}>{fetchError}</div> : null}

{settings.volatilityWarningEnabled &&
volatilityUntil &&
Date.now() < volatilityUntil ? (
  <div style={styles.volatilityWarning}>
    <strong>⚠️  MARKET VOLATILITY ALERT!  ⚠️ </strong>
    <br />
    Please call us before making any Trade.
  </div>
) : null}

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

function LoadingScreen({ theme = "dark", logoSrc = "/logo.png" }) {
  return (
    <main style={{ ...styles.pageCenter, ...themeTokens[theme] }}>
      <Image   src={logoSrc}   alt="Ronak Jewellers"   width={250}   height={250}   style={styles.logoImage} />
      <h1 style={styles.brandName}>Ronak Jewellers</h1>
      <p style={styles.muted}>Loading live bullion rates...</p>
    </main>
  );
}

function ClosedScreen({ theme = "dark", logoSrc = "/logo.png" }) {
  return (
    <main style={{ ...styles.pageCenter, ...themeTokens[theme] }}>
      <Image   src={logoSrc}   alt="Ronak Jewellers"   width={250}   height={250}   style={styles.logoImage} />
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
    background: "var(--rj-page-bg)",
    color: "var(--rj-text)",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    padding: "28px 18px 40px",
    boxSizing: "border-box",
    transition: "background 0.45s ease, color 0.45s ease",
  },
  kachhiValue: {
    fontSize: 29,
    fontWeight: 600,
   },

    pageCenter: {
    minHeight: "100vh",
    background: "var(--rj-page-bg)",
    color: "var(--rj-text)",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    padding: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    textAlign: "center",
    boxSizing: "border-box",
    transition: "background 0.45s ease, color 0.45s ease",
  },

  hero: {
    textAlign: "center",
    marginBottom: 28,
  },

  logoImage: {
    marginBottom: 12,
    transition: "opacity 0.35s ease, transform 0.35s ease",
  },

  brandName: {
    margin: 0,
    fontSize: "clamp(34px, 7vw, 58px)",
    letterSpacing: "0.04em",
    color: "var(--rj-brand)",
    textShadow: "var(--rj-brand-shadow)",
  },
productPanel: {
  width: "100%",
  maxWidth: 760,
  margin: "14px auto",
  border: "2px solid var(--rj-panel-border)",
  borderRadius: 12,
  overflow: "hidden",
  background: "var(--rj-panel-bg)",
  transition: "background 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease",
},
productToggle: {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "var(--rj-brand)",
  padding: "12px 10px",
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

themeToggleWrap: {
  margin: "14px auto 0",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "7px 10px",
  borderRadius: 999,
  border: "1px solid var(--rj-panel-border)",
  background: "var(--rj-toggle-bg)",
  color: "var(--rj-brand)",
  transition: "background 0.35s ease, border-color 0.35s ease, color 0.35s ease",
},

themeSwitch: {
  position: "relative",
  width: 70,
  height: 36,
  borderRadius: 999,
  border: "1px solid var(--rj-panel-border)",
  background: "var(--rj-toggle-bg)",
  cursor: "pointer",
  padding: 3,
  transition: "background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
  boxShadow: "inset 0 1px 6px rgba(0,0,0,0.18)",
},

themeSwitchThumb: {
  position: "absolute",
  top: 3,
  left: 3,
  width: 28,
  height: 28,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--rj-toggle-thumb)",
  boxShadow: "0 5px 14px rgba(0,0,0,0.25)",
  fontSize: 15,
  transition: "transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), background 0.35s ease",
},

themeIcon: {
  fontSize: 14,
  lineHeight: 1,
},

themeToggleText: {
  minWidth: 42,
  color: "var(--rj-muted)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
},
  kachhiBox: {
  margin: "28px auto 0",
  maxWidth: 520,
  border: "1px solid var(--rj-panel-border)",
  background: "var(--rj-call-bg)",
  color: "var(--rj-brand)",
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
  color: "var(--rj-muted)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
},
live: {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--rj-brand)",
  boxShadow: "0 0 12px var(--rj-brand)",
  display: "inline-block",
  animation: "pulse 1.4s infinite",
},
liveDot: {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--rj-brand)",
  boxShadow: "0 0 12px var(--rj-brand)",
  display: "inline-block",
  verticalAlign: "middle",

},
  mainCard: {
    width: "100%",
    maxWidth: 920,
    margin: "0 auto",
    background: "var(--rj-main-card-bg)",
    border: "1px solid var(--rj-main-card-border)",
    borderRadius: 26,
    padding: "7px",
    boxShadow: "var(--rj-soft-shadow), inset 0 1px 0 rgba(255,255,255,0.18)",
    boxSizing: "border-box",
    marginBottom : 15,
    transition: "background 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease",
  },
  
disclaimer: {
    marginTop: 26,
    color: "var(--rj-muted)",
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
    color: "var(--rj-label)",
    fontSize: 13,
    letterSpacing: "0.11em",
    textTransform: "uppercase",
  },
  badge: {
    border: "1px solid rgba(214,180,92,0.34)",
    background: "rgba(214,180,92,0.08)",
    color: "var(--rj-brand)",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 13,
    whiteSpace: "nowrap",
  },

  rateGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    padding: "7px 8px",
    gap: 18,
  },

  sideCard: {
    background: "var(--rj-card-bg)",
    border: "1px solid var(--rj-card-border)",
    borderRadius: 22,
    padding: 20,
    transition: "background 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease, transform 0.25s ease",
  },

  mcxPrice: {
    margin: "0 0 18px",
    color: "var(--rj-price)",
    fontSize: "clamp(28px, 6vw, 42px)",
  },

  unit: {
    fontSize: 15,
    color: "var(--rj-muted)",
    fontWeight: 400,
  },

  premiumBox: {
    margin: "11px 0 15px",
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-premium-bg)",
    color: "var(--rj-premium-text)",
    borderRadius: 7,
    padding: "9px 11px",
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
  },

  finalLabel: {
    color: "var(--rj-label)",
    margin: "0 0 8px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontSize: 13,
  },

  finalPrice: {
    margin: 0,
    color: "var(--rj-final)",
    fontSize: "clamp(34px, 8vw, 54px)",
    lineHeight: 1,
    transition: "color 0.35s ease, text-shadow 0.35s ease",
  },
metaRow: {
  display: "flex",
  justifyContent: "center",
  marginBottom: 12,
  color: "var(--rj-muted)",
  },
 
metaItem: {
 padding: "8px",
  color: "var(--rj-muted)",
  fontSize: 12,
  textAlign: "center",
},
volatilityWarning: {
  maxWidth: 760,
  margin: "0 auto 22px",
  border: "1px solid rgba(255, 193, 7, 0.45)",
  background:
    "linear-gradient(145deg, rgba(255,193,7,0.16), rgba(35,35,35,0.92))",
  color: "var(--rj-brand)",
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
    color: "var(--rj-brand)",
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-call-bg)",
    boxShadow: "var(--rj-call-shadow)",
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
    background: "var(--rj-main-card-bg)",
    border: "1px solid var(--rj-main-card-border)",
    borderRadius: 24,
    padding: 24,
    boxSizing: "border-box",
  },

  closedTitle: {
    color: "var(--rj-brand)",
    marginTop: 0,
  },

  muted: {
    color: "var(--rj-muted)",
  },
mcxReference: {
  margin: "18px auto 0",
  color: "var(--rj-muted)",
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
  marginBottom: 11,
  width: "100%",
  maxWidth: 500,
  background: "var(--rj-card-bg)",
  border: "1px solid var(--rj-main-card-border)",
  borderRadius: 35,
  padding: 10,
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

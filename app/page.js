"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import Image from "next/image";
import InstallPWAButton from "./components/InstallPWAButton";
import DealerAccessGate from "./components/DealerAccessGate";
import "./global.css";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

const db = getFirestore(app);

const LOGOUT_SUCCESS_KEY = "rj-logout-success";

const translations = {
  en: {
    liveRates: "LIVE RATES",
    myAlerts: "MY ALERTS",
    liveStatus: "Live Status",
    activeContracts: "Active Contracts",
    utilities: "Utilities",
    theme: "Theme",
    keepScreenOn: "Keep Screen On",
    quickActions: "Quick Actions",
    enableNotifications: "Enable Notifications",
    feedback: "Feedback",
    account: "Account",
    logout: "Logout",
    disclaimerTitle: "Disclaimer",
    disclaimerText: "Rates are indicative and may vary depending on confirmation at the time of enquiry.",
    marketOpen: "Market Open",
    marketClosed: "Market Closed",
    holidayMode: "Holiday Mode",
    lastUpdated: "Last updated",
    volatilityTitle: "⚠️ MARKET VOLATILITY ALERT! ⚠️",
    volatilityBody: "Please call us before making any trade.",
    alertsTitle: "Set your Target Price alerts",
    rateType: "Rate Type",
    condition: "Condition",
    targetRate: "Target Rate",
    belowEqual: "Below or Equal",
    aboveEqual: "Above or Equal",
    saveAlert: "Save Alert",
    remove: "Remove",
    noAlerts: "No active alerts.",
    alertSaved: "Alert saved successfully.",
    alertRemoved: "Alert removed.",
    notificationEnabled: "Notifications enabled.",
    notificationDenied: "Notification permission was not granted.",
    notificationUnsupported: "Notifications are not supported on this device.",
    feedbackTitle: "Send Feedback",
    feedbackPlaceholder: "Type your feedback here...",
    submitFeedback: "Submit Feedback",
    feedbackSuccess: "Thank you. Feedback submitted successfully.",
    close: "Close",
    silver99: "SILVER 99 [SA Chorsa]",
    silver100: "SILVER 100 [PetiCut]",
    gold995: "GOLD 995",
    mcxBuy: "MCX Buy",
    mcxSell: "MCX Sell",
    buyingRate: "Buying Rate",
    sellingRate: "Selling Rate",
    weBuyAt: "We Buy at :",
    weSellAt: "We Sell at :",
    previousClosing: "Previous Closing",
    ratesUnavailable: "Live rates are unavailable at the moment",
    visitAgain: "Please visit again during market hours.",
    loadingRates: "Loading Rates... Please Wait...",
    liveBullion: "LIVE RATES",
    finalDisclaimer: "Rates displayed are based on market conditions and applicable premiums. Final rates may vary depending on confirmation at the time of enquiry.",
    activeAlerts: "Active Alerts",
    triggeredAlerts: "Triggered Alerts",
    edit: "Edit",
    updateAlert: "Update Alert",
    cancel: "Cancel",
    alertUpdated: "Alert updated successfully.",
    compactView: "compact view",
    bigView: "LARGE VIEW",
    maintenanceTitle: "Website Under Maintenance",
    maintenanceText: "We are Upgrading. Please check again shortly.",
  },
};

const RATE_ALERT_OPTIONS = [
  { value: "silver_mcx_buy", label: "Silver MCX Buy" },
  { value: "silver_mcx_sell", label: "Silver MCX Sell" },
  { value: "gold_mcx_buy", label: "Gold MCX Buy" },
  { value: "gold_mcx_sell", label: "Gold MCX Sell" },
];

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(-10);
  return digits.length === 10 ? digits : "";
}

function getAlertRatesFromQuote(data) {
  return {
    silver_mcx_buy: Number(data?.mcxBuyPrice || 0),
    silver_mcx_sell: Number(data?.mcxSellPrice || 0),
    gold_mcx_buy: Number(data?.goldMcxBuyPrice || 0),
    gold_mcx_sell: Number(data?.goldMcxSellPrice || 0),
  };
}
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
    "--rj-floating-bg": "rgba(10,10,10,0.78)",
    "--rj-floating-shadow": "0 20px 50px rgba(0,0,0,0.35)",
    "--rj-tab-bg": "rgba(214,180,92,0.05)",
    "--rj-toast-bg": "linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02)), radial-gradient(circle at top left, rgba(243,217,139,0.16), transparent 44%), rgba(18, 17, 13, 0.48)",
    "--rj-toast-border": "rgba(243, 217, 139, 0.30)",
    "--rj-toast-shadow": "0 18px 45px rgba(0,0,0,0.28), 0 0 24px rgba(214,180,92,0.08), inset 0 1px 0 rgba(255,255,255,0.08)",
    "--rj-danger-border": "rgba(255,120,120,0.35)",
    "--rj-danger-bg": "rgba(120,20,20,0.18)",
    "--rj-danger-text": "#ffb4b4",
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
    "--rj-card-bg": "linear-gradient(145deg, rgba(255,255,255), rgba(255,225,170,0.89))",
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
    "--rj-floating-bg": "rgba(255,246,224,0.88)",
    "--rj-floating-shadow": "0 18px 44px rgba(128,81,0,0.18)",
    "--rj-tab-bg": "rgba(255,255,255,0.40)",
    "--rj-toast-bg": "linear-gradient(135deg, rgba(255,255,255,0.82), rgba(255,236,196,0.62)), radial-gradient(circle at top left, rgba(148,97,0,0.12), transparent 44%), rgba(255, 246, 224, 0.78)",
    "--rj-toast-border": "rgba(128,81,0,0.24)",
    "--rj-toast-shadow": "0 18px 45px rgba(128,81,0,0.16), 0 0 20px rgba(148,97,0,0.08), inset 0 1px 0 rgba(255,255,255,0.55)",
    "--rj-danger-border": "rgba(128,81,0,0.32)",
    "--rj-danger-bg": "linear-gradient(145deg, rgba(255,250,235,0.92), rgba(255,218,143,0.72))",
    "--rj-danger-text": "#5a2600",
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

function getRateMovement(currentValue, previousValue) {
  const current = Number(currentValue);
  const previous = Number(previousValue);

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    current <= 0 ||
    previous <= 0
  ) {
    return null;
  }

  const diff = current - previous;

  if (diff > 0) return { direction: "up", diff };
  if (diff < 0) return { direction: "down", diff };
  return { direction: "flat", diff: 0 };
}

function buildRateMovements(currentQuote, previousQuote) {
  if (!currentQuote || !previousQuote) return {};

  return {
    silverMcxBuy: getRateMovement(currentQuote.mcxBuyPrice, previousQuote.mcxBuyPrice),
    silverMcxSell: getRateMovement(currentQuote.mcxSellPrice, previousQuote.mcxSellPrice),
    goldMcxBuy: getRateMovement(currentQuote.goldMcxBuyPrice, previousQuote.goldMcxBuyPrice),
    goldMcxSell: getRateMovement(currentQuote.goldMcxSellPrice, previousQuote.goldMcxSellPrice),
  };
}

function MovementBadge({ movement }) {
  if (!movement) return null;

  const isUp = movement.direction === "up";
  const isDown = movement.direction === "down";
  const arrow = isUp ? "▲" : isDown ? "▼" : "—";
  const value = movement.diff === 0 ? "0" : formatPrice(Math.abs(movement.diff));

  return (
    <span
      style={{
        ...styles.movementBadge,
        ...(isUp
          ? styles.movementUp
          : isDown
          ? styles.movementDown
          : styles.movementFlat),
      }}
    >
      {arrow} {value}
    </span>
  );
}

function ViewModeToggle({ viewMode, setViewMode, t }) {
  function changeMode(mode) {
    setViewMode(mode);
    try {
      window.localStorage.setItem("rj-view-mode", mode);
    } catch {}
  }

  return (
    <div style={styles.viewModeRow}>
      <button
        type="button"
        style={viewMode === "big" ? styles.viewModeButtonActive : styles.viewModeButton}
        onClick={() => changeMode("big")}
      >
        {t.bigView}
      </button>
      <button
        type="button"
        style={viewMode === "compact" ? styles.viewModeButtonActive : styles.viewModeButton}
        onClick={() => changeMode("compact")}
      >
        {t.compactView}
      </button>
    </div>
  );
}

function compactMoney(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return formatPrice(value);
}

function compactPremium(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return formatPremium(value);
}

function CompactRatesTable({ rows }) {
  return (
    <section style={styles.compactTableWrap}>
      <table style={styles.compactTable}>
        <colgroup>
          <col style={{ width: "21%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "25%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "25%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={styles.compactTh}>Product</th>
            <th style={styles.compactTh}></th>
            <th style={styles.compactTh}>MCX rate</th>
            <th style={styles.compactTh}>Premium</th>
            <th style={styles.compactTh}>Final rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <>
              <tr key={`${row.id}-buy`}>
                <td style={styles.compactProductCell} rowSpan={2}>
                  {row.compactTitle || row.title}
                </td>
                <td style={styles.compactSideCell}>Buy</td>
                <td style={styles.compactTd}>{compactMoney(row.mcxBuy)}</td>
                <td style={styles.compactTd}>{compactPremium(row.buyPremium)}</td>
                <td style={styles.compactFinalTd}>{compactMoney(row.finalBuying)}</td>
              </tr>
              <tr key={`${row.id}-sell`}>
                <td style={styles.compactSideCell}>Sell</td>
                <td style={styles.compactTd}>{compactMoney(row.mcxSell)}</td>
                <td style={styles.compactTd}>{compactPremium(row.sellPremium)}</td>
                <td style={styles.compactFinalTd}>{compactMoney(row.finalSelling)}</td>
              </tr>
            </>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MaintenanceScreen({ theme = "dark", logoSrc = "/logo.png", t = translations.en, settings, children }) {
  const message = String(settings?.maintenanceMessage || "").trim() || t.maintenanceText;

  return (
    <main style={{ ...styles.pageCenter, ...themeTokens[theme] }}>
      {children}
      <Image src={logoSrc} alt="Ronak Jewellers" width={250} height={250} style={styles.logoImage} />
      <h1 style={styles.brandName}>Ronak Jewellers</h1>
      <div style={styles.maintenanceCard}>
        <h2 style={styles.closedTitle}>{t.maintenanceTitle}</h2>
        <p style={styles.muted}>{message}</p>
      </div>
    </main>
  );
}

function formatAlertDate(value) {
  const date = value?._seconds
    ? new Date(value._seconds * 1000)
    : value?.toDate
    ? value.toDate()
    : value
    ? new Date(value)
    : null;

  if (!date || Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN");
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

function ThemeToggle({
  theme,
  onToggle,
  hideText = false,
  leftIcon = "🌙",
  rightIcon = "☀️",
  thumbOffIcon = "🌙",
  thumbOnIcon = "☀️" })
{
  const isLight = theme === "light";

  return (
    <div style={styles.themeToggleWrap}>
     <span style={styles.themeIcon}>{leftIcon}</span>
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
        {isLight ? thumbOnIcon : thumbOffIcon}
        </span>
      </button>
      <span style={styles.themeIcon}>{rightIcon}</span>
      {!hideText && (
  <span style={styles.themeToggleText}>
    {isLight ? "Light" : "Dark"}
  </span>
)}
  </div>
  );
}

function GlobalAnimationStyles() {
  return (
    <style>{`
      @keyframes rjOverlayFade {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes rjMenuPop {
        0% { transform: scale(0.92); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }

      @keyframes rjSidebarItem {
        from {
          opacity: 0;
          transform: translateX(18px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes rjWelcomeCard {
        0% {
          opacity: 0;
          transform: translateY(-14px) scale(0.96);
          filter: blur(5px);
        }
        10% {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
        82% {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
        100% {
          opacity: 0;
          transform: translateY(-16px) scale(0.985);
          filter: blur(3px);
        }
      }

      @keyframes rjWelcomeShine {
        0% { transform: translateX(-125%) rotate(10deg); opacity: 0; }
        18% { opacity: 0.55; }
        55% { opacity: 0.22; }
        100% { transform: translateX(140%) rotate(10deg); opacity: 0; }
      }
    `}</style>
  );
}

function MarketMeta({ opening, closing}) {
  return (
   
      <div style={styles.metaItem}>
        <p>OPEN:{formatPrice(opening)}  |  CLOSE:{formatPrice(closing)} </p>
      </div>
   
  );
}

function SideBarMenu({
  theme,
  sidebarOpen,
  setSidebarOpen,
  toggleTheme,
  screenAwake,
  toggleScreenAwake,
  now,
  quote,
  settings,
  marketState,
  dealerProfile,
  onDealerLogout,
  t,
  onFeedbackOpen,
  onEnableNotifications,
  viewMode,
  setViewMode,
}) {
  const marketStatus = settings?.holidayMode
    ? t.holidayMode
    : marketState.shouldShowRates
    ? t.marketOpen
    : t.marketClosed;

  return (
    <>
      <GlobalAnimationStyles />

      <button
        type="button"
        style={theme === "light" ? styles.menuButtonLight : styles.menuButton}
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </button>

      {sidebarOpen ? (
        <div
          style={styles.sidebarOverlay}
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        style={{
          ...(theme === "light" ? styles.sidebarLight : styles.sidebar),
          transform: sidebarOpen ? "translateX(0)" : "translateX(110%)",
        }}
      >
        <div style={styles.sidebarHeader}>
          <div>
            <strong>Ronak Jewellers</strong>
            <p style={styles.sidebarSubTitle}>Live Rates</p>
          </div>

          <button
            type="button"
            style={
              theme === "light"
                ? styles.sidebarCloseLight
                : styles.sidebarClose
            }
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>



        <div style={{ ...styles.sidebarSection, animationDelay: "0.10s" }}>
          <span style={theme === "light" ? styles.sidebarLabelLight : styles.sidebarLabel}>
            {t.liveStatus}
          </span>

          <div style={styles.sidebarInfoCard}>
            <div style={styles.sidebarStatusRow}>
              <span style={styles.live} />
              <strong>{marketStatus}</strong>
            </div>
            <p style={styles.sidebarMiniText}>
              {t.lastUpdated}: {formatCurrentTime(now)}
            </p>
          </div>
        </div>

        <div style={{ ...styles.sidebarSection, animationDelay: "0.16s" }}>
          <span
            style={
              theme === "light"
                ? styles.sidebarLabelLight
                : styles.sidebarLabel
            }
          >
            {t.activeContracts}
          </span>
           <div style={styles.sidebarMiniGrid}>
            <div style={styles.statusRow}>
              <span>Silver : </span>
              <strong>{quote?.contract || "--"}</strong>
            </div>

            <div style={styles.statusRow}>
              <span>Gold : </span>
              <strong>{quote?.goldContract || "--"}</strong>
            </div>
          </div>
         </div>
<div style={{ ...styles.sidebarSection, animationDelay: "0.19s" }}>
  <span
    style={
      theme === "light"
        ? styles.sidebarLabelLight
        : styles.sidebarLabel
    }
  >
    {t.utilities}
  </span>

  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16,}} >
    <span>{t.theme}</span>

    <ThemeToggle theme={theme} onToggle={toggleTheme} hideText />
  </div>


  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    }}
  >
    <span>{t.keepScreenOn}</span>
<ThemeToggle
  theme={screenAwake ? "light" : "dark"}
  onToggle={toggleScreenAwake}
  hideText
  leftIcon="🔒"
  rightIcon="🔓"
  thumbOffIcon="💤"
  thumbOnIcon="📱"
/>
  </div>

  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <span>{t.bigView} / {t.compactView}</span>
    <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} t={t} />
  </div>
</div>
        <div style={{ ...styles.sidebarSection, animationDelay: "0.22s" }}>
          <span
            style={
              theme === "light"
                ? styles.sidebarLabelLight
                : styles.sidebarLabel
            }
          >
            {t.quickActions}
          </span>

   <button type="button" style={{ ...styles.sidebarAction, width: "100%", cursor: "pointer" }} onClick={onEnableNotifications}>
    🔔 {t.enableNotifications}
  </button>

  <button type="button" style={{ ...styles.sidebarAction, width: "100%", cursor: "pointer" }} onClick={onFeedbackOpen}>
    💬 {t.feedback}
  </button>

   <InstallPWAButton
  variant="sidebar"
  style={styles.sidebarAction}
/>
          <a href="tel:9479893898" style={styles.sidebarAction}>
            📞 Call 9479893898
          </a>

          <a href="tel:9300053012" style={styles.sidebarAction}>
            📞 Call 9300053012
          </a>                      
        </div>

        {dealerProfile ? (
          <div style={{ ...styles.sidebarSection, animationDelay: "0.25s" }}>
            <span
              style={
                theme === "light"
                  ? styles.sidebarLabelLight
                  : styles.sidebarLabel
              }
            >
              {t.account}
            </span>

            <div style={styles.sidebarInfoCard}>
              <strong>{dealerProfile.name || dealerProfile.phone || "Authorized User"}</strong>
              {dealerProfile.firm ? (
                <p style={styles.sidebarMiniText}>{dealerProfile.firm}</p>
              ) : null}
              <p style={styles.sidebarMiniText}>📱 {dealerProfile.phone || "--"}</p>
              <button
                type="button"
                style={{ ...styles.sidebarAction, width: "100%", marginTop: 12, marginBottom: 0, cursor: "pointer" }}
                onClick={onDealerLogout}
              >
                {t.logout}
              </button>
            </div>
          </div>
        ) : null}

        <div style={{ ...styles.sidebarSection, animationDelay: "0.28s" }}>
          <span
            style={
              theme === "light"
                ? styles.sidebarLabelLight
                : styles.sidebarLabel
            }
          >
            {t.disclaimerTitle}
          </span>

          <p style={styles.sidebarDisclaimer}>
            {t.disclaimerText}
          </p>
        </div>
      </aside>
    </>
  );
}
function languageWelcome(firstName) {
  return `Welcome, ${firstName} 👋`;
}

function WelcomeToast({ profile, visible, t }) {
  if (!visible || !profile) {
    return null;
  }

  const firstName =
    profile.firstName ||
    String(profile.name || "").trim().split(/\s+/)[0] ||
    "Friend";

  return (
    <div style={styles.welcomeToast}>
      <div style={styles.welcomeShine} />
      <div style={styles.welcomeTitle}>{languageWelcome(firstName)}</div>
      <div style={styles.welcomeSubtitle}>
        Your live rates access is active for today.
      </div>
      <div style={styles.welcomePhone}>📱 {profile.phone || ""}</div>
    </div>
  );
}


function BottomTabs({ activeTab, setActiveTab, t }) {
  return (
    <nav style={styles.bottomTabs}>
      <button
        type="button"
        style={activeTab === "rates" ? styles.bottomTabActive : styles.bottomTab}
        onClick={() => setActiveTab("rates")}
      >
        {t.liveRates}
      </button>
      <button
        type="button"
        style={activeTab === "alerts" ? styles.bottomTabActive : styles.bottomTab}
        onClick={() => setActiveTab("alerts")}
      >
        {t.myAlerts}
      </button>
    </nav>
  );
}

function FeedbackModal({ visible, t, feedbackText, setFeedbackText, feedbackMessage, onSubmit, onClose, loading }) {
  if (!visible) return null;

  return (
    <div style={styles.feedbackOverlay}>
      <div style={styles.feedbackModal}>
        <h2 style={{ marginTop: 0 }}>{t.feedbackTitle}</h2>
        <textarea
          style={styles.feedbackTextarea}
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder={t.feedbackPlaceholder}
          rows={5}
        />
        <button type="button" style={styles.primaryFeedbackButton} onClick={onSubmit} disabled={loading}>
          {loading ? "..." : t.submitFeedback}
        </button>
        <button type="button" style={styles.secondaryFeedbackButton} onClick={onClose}>
          {t.close}
        </button>
        {feedbackMessage ? <p style={styles.feedbackMessage}>{feedbackMessage}</p> : null}
      </div>
    </div>
  );
}

function AlertsPage({
  theme,
  logoSrc,
  t,
  activeTab,
  setActiveTab,
  alertForm,
  setAlertForm,
  alerts,
  triggeredAlerts,
  alertListTab,
  setAlertListTab,
  editingAlertId,
  alertMessage,
  saveTargetAlert,
  removeTargetAlert,
  refreshAlerts,
  startEditTargetAlert,
  cancelEditTargetAlert,
}) {
  const visibleAlerts = alertListTab === "triggered" ? triggeredAlerts : alerts;

  return (
    <main style={{ ...styles.page, ...themeTokens[theme], paddingBottom: 105 }}>
      <section style={styles.hero}>
        <Image src={logoSrc} alt="Ronak Jewellers" width={250} height={250} style={styles.logoImage} />
        <h2 style={styles.brandName}>Ronak Jewellers</h2>
      </section>

      <section style={styles.mainCard}>
        <h3 style={{ textAlign: "center" }}>{editingAlertId ? t.updateAlert : t.alertsTitle}</h3>
        <div style={styles.alertFormGrid}>
          <div>
            <label style={styles.alertLabel}>{t.rateType}</label>
            <select
              style={styles.alertInput}
              value={alertForm.rateType}
              onChange={(e) => setAlertForm((prev) => ({ ...prev, rateType: e.target.value }))}
            >
              {RATE_ALERT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.alertLabel}>{t.condition}</label>
            <select
              style={styles.alertInput}
              value={alertForm.condition}
              onChange={(e) => setAlertForm((prev) => ({ ...prev, condition: e.target.value }))}
            >
              <option value="below_equal">{t.belowEqual}</option>
              <option value="above_equal">{t.aboveEqual}</option>
            </select>
          </div>

          <div>
            <label style={styles.alertLabel}>{t.targetRate}</label>
            <input
              style={styles.alertInput}
              type="number"
              inputMode="decimal"
              value={alertForm.targetRate}
              onChange={(e) => setAlertForm((prev) => ({ ...prev, targetRate: e.target.value }))}
              placeholder="target rate"
            />
          </div>

          <button type="button" style={styles.alertSaveButton} onClick={saveTargetAlert}>
            {editingAlertId ? t.updateAlert : t.saveAlert}
          </button>
        </div>

        {editingAlertId ? (
          <button type="button" style={styles.secondaryFeedbackButton} onClick={cancelEditTargetAlert}>
            {t.cancel}
          </button>
        ) : null}

        {alertMessage ? <p style={styles.messageText}>{alertMessage}</p> : null}

        <div style={styles.alertListHeader}>
          <strong>{t.myAlerts}</strong>
          <button type="button" style={styles.smallActionButton} onClick={refreshAlerts}>Refresh</button>
        </div>

        <div style={styles.alertTabs}>
          <button
            type="button"
            style={alertListTab === "active" ? styles.alertTabActive : styles.alertTab}
            onClick={() => setAlertListTab("active")}
          >
            {t.activeAlerts} ({alerts.length})
          </button>
          <button
            type="button"
            style={alertListTab === "triggered" ? styles.alertTabActive : styles.alertTab}
            onClick={() => setAlertListTab("triggered")}
          >
            {t.triggeredAlerts} ({triggeredAlerts.length})
          </button>
        </div>

        {visibleAlerts.length === 0 ? (
          <p style={{ ...styles.muted, textAlign: "center" }}>
            {alertListTab === "active" ? t.noAlerts : "No triggered alerts."}
          </p>
        ) : (
          visibleAlerts.map((alert) => {
            const rateOption = RATE_ALERT_OPTIONS.find((option) => option.value === alert.rateType);
            return (
              <div key={alert.id} style={styles.alertCard}>
                <div>
                  <strong>{rateOption?.label || alert.rateType}</strong>
                  <p style={styles.mutedSmall}>
                    {alert.condition === "below_equal" ? "≤" : "≥"} ₹ {formatPrice(alert.targetRate)}
                  </p>
                  {alertListTab === "triggered" ? (
                    <p style={styles.mutedSmall}>
                      Triggered: {formatAlertDate(alert.triggeredAt || alert.updatedAt || alert.createdAt)}
                    </p>
                  ) : null}
                </div>

                {alertListTab === "active" ? (
                  <div style={styles.alertActionRow}>
                    <button type="button" style={styles.smallActionButton} onClick={() => startEditTargetAlert(alert)}>
                      {t.edit}
                    </button>
                    <button type="button" style={styles.removeAlertButton} onClick={() => removeTargetAlert(alert.id)}>
                      {t.remove}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      <BottomTabs activeTab={activeTab} setActiveTab={setActiveTab} t={t} />
    </main>
  );
}

async function logVolatilityTrigger(payload) {
  try {
    await fetch("/api/volatility-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (err) {
    console.error("Volatility log failed", err);
  }
}

export default function Home() {
  const [settings, setSettings] = useState(null);
  const [quote, setQuote] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [now, setNow] = useState(new Date());
  const [priceHistory, setPriceHistory] = useState([]);
  const [volatilityUntil, setVolatilityUntil] = useState(null);
  const volatilityUntilRef = useRef(null);
  const [serverVolatilityUntil, setServerVolatilityUntil] = useState(null);
  const volatilityLogInProgressRef = useRef(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [dealerProfile, setDealerProfile] = useState(null);
  const [showWelcomeCard, setShowWelcomeCard] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [screenAwake, setScreenAwake] = useState(false);
  const [wakeLock, setWakeLock] = useState(null);
  const language = "en";
  const [activeTab, setActiveTab] = useState("rates");
  const [targetAlerts, setTargetAlerts] = useState([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [alertListTab, setAlertListTab] = useState("active");
  const [editingAlertId, setEditingAlertId] = useState("");
  const [alertForm, setAlertForm] = useState({
    rateType: "silver_mcx_buy",
    condition: "below_equal",
    targetRate: "",
  });
  const [alertMessage, setAlertMessage] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const targetCheckInProgressRef = useRef(false);
  const previousQuoteRef = useRef(null);
  const [rateMovements, setRateMovements] = useState({});
  const [viewMode, setViewMode] = useState("big");
  const [openProducts, setOpenProducts] = useState({
   silver99: true,
   silver100: false,
   gold995: false,
   goldHoliday: true,
});

const t = translations.en;
  
async function enableScreenAwake() {
  try {
    if (!("wakeLock" in navigator)) {
      alert("Screen Awake is not supported on this device.");
      return;
    }

    const lock = await navigator.wakeLock.request("screen");

    setWakeLock(lock);
    setScreenAwake(true);

    lock.addEventListener("release", () => {
      setScreenAwake(false);
      setWakeLock(null);
    });
  } catch (err) {
    console.error(err);
  }
}

async function disableScreenAwake() {
  try {
    if (wakeLock) {
      await wakeLock.release();
    }
  } catch (err) {
    console.error(err);
  }

  setWakeLock(null);
  setScreenAwake(false);
}

function toggleScreenAwake() {
  if (screenAwake) {
    disableScreenAwake();
  } else {
    enableScreenAwake();
  }
}

function CustomNotice({ message }) {
  if (!message?.trim()) {
    return null;
  }
  return (
    <div style={styles.statusRow}>
      {" "}
      <span>{ message.trim() }</span>
    </div>
  );
}

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("rj-theme");

    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }

    const savedViewMode = window.localStorage.getItem("rj-view-mode");
    if (savedViewMode === "compact" || savedViewMode === "big") {
      setViewMode(savedViewMode);
    }
  }, []);

useEffect(() => {
  if (!accessGranted) return;

  const unsub = onSnapshot(doc(db, "system", "volatility"), (snapshot) => {
    const data = snapshot.data();

    if (!data?.active || !data?.expiresAt) {
      setServerVolatilityUntil(null);
      return;
    }

    const expiresAt =
      data.expiresAt?.toDate ? data.expiresAt.toDate().getTime() : Number(data.expiresAt);

    setServerVolatilityUntil(expiresAt);
  });

  return () => unsub();
}, [accessGranted]);

useEffect(() => {
  const handleVisibility = async () => {
    if (
      document.visibilityState === "visible" &&
      screenAwake &&
      !wakeLock &&
      "wakeLock" in navigator
    ) {
      try {
        const lock =
          await navigator.wakeLock.request("screen");

        setWakeLock(lock);
      } catch {}
    }
  };

  document.addEventListener(
    "visibilitychange",
    handleVisibility
  );

  return () =>
    document.removeEventListener(
      "visibilitychange",
      handleVisibility
    );
}, [screenAwake, wakeLock]);
  useEffect(() => {
    document.documentElement.style.colorScheme =
      theme === "light" ? "light" : "dark";
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("rj-theme", nextTheme);
  }

  function handleAccessGranted(profile) {
    setSidebarOpen(false);
    setDealerProfile(profile || null);
    setAccessGranted(true);
    setShowWelcomeCard(true);
  }

  function handleDealerLogout() {
    try {
      window.localStorage.removeItem("rj-dealer-session-expires-at");
      window.localStorage.removeItem("rj-dealer-profile");
      window.localStorage.setItem(LOGOUT_SUCCESS_KEY, "1");
    } catch (err) {
      console.error(err);
    }

    setDealerProfile(null);
    setShowWelcomeCard(false);
    setAccessGranted(false);
    setSettings(null);
    setQuote(null);
  }


  async function registerPushToken(options = {}) {
    const silent = Boolean(options?.silent);

    try {
      if (!dealerProfile?.phone || !dealerProfile?.deviceId) {
        return false;
      }

      const supported = await isSupported().catch(() => false);
      if (!supported || typeof window === "undefined" || !("Notification" in window)) {
        if (!silent) setAlertMessage(t.notificationUnsupported);
        return false;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (!silent) setAlertMessage(t.notificationDenied);
        return false;
      }

      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      });
      await registration.update().catch(() => {});
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (!token) return false;

      await fetch("/api/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: dealerProfile.phone,
          deviceId: dealerProfile.deviceId,
          token,
          language,
        }),
      });

      if (!silent) setAlertMessage(t.notificationEnabled);
      return true;
    } catch (err) {
      console.error(err);
      if (!silent) {
        setAlertMessage("Notification setup failed. Alert can still be saved.");
      }
      return false;
    }
  }

  async function loadTargetAlerts() {
    if (!dealerProfile?.phone || !dealerProfile?.deviceId) return;

    try {
      const params = new URLSearchParams({
        phone: dealerProfile.phone,
        deviceId: dealerProfile.deviceId,
      });
      const res = await fetch(`/api/target-alerts?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setTargetAlerts(data.activeAlerts || data.alerts || []);
        setTriggeredAlerts(data.triggeredAlerts || []);
      }
    } catch (err) {
      console.error(err);
    }
  }
function getCurrentAlertRate(rateType) {
  if (!quote) return null;

  const rates = getAlertRatesFromQuote(quote);
  const currentRate = Number(rates[rateType]);

  return Number.isFinite(currentRate) && currentRate > 0
    ? currentRate
    : null;
}

function isTargetAlreadyReached(rateType, condition, targetRate) {
  const currentRate = getCurrentAlertRate(rateType);
  const target = Number(targetRate);

  if (!Number.isFinite(currentRate) || currentRate <= 0) {
    return false;
  }

  if (!Number.isFinite(target) || target <= 0) {
    return false;
  }

  if (condition === "below_equal") {
    return currentRate <= target;
  }

  if (condition === "above_equal") {
    return currentRate >= target;
  }

  return false;
}

  async function saveTargetAlert() {
    if (!dealerProfile?.phone || !dealerProfile?.deviceId) return;

    setAlertMessage("");
    const editingId = editingAlertId;
    const target = Number(alertForm.targetRate);

if (!Number.isFinite(target) || target <= 0) {
  setAlertMessage("Please enter a valid target rate.");
  return;
}

if (
  isTargetAlreadyReached(
    alertForm.rateType,
    alertForm.condition,
    alertForm.targetRate
  )
) {
  const selectedRate =
    RATE_ALERT_OPTIONS.find((item) => item.value === alertForm.rateType)?.label ||
    "Selected rate";

  const currentRate = getCurrentAlertRate(alertForm.rateType);
  const conditionText =
    alertForm.condition === "below_equal"
      ? "below/equal"
      : "above/equal";

  setAlertMessage(
    `${selectedRate} is already ${conditionText} your target. Current rate: ₹${formatPrice(currentRate)}. Please enter a fresh target.`
  );
  return;
}
    try {
      registerPushToken({ silent: true }).then((pushReady) => {
        if (!pushReady) {
          console.warn("Push notification not ready. Alert will still be saved.");
        }
      }).catch((err) => {
        console.warn("Push notification setup failed:", err);
      });

      const res = await fetch("/api/target-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          phone: dealerProfile.phone,
          deviceId: dealerProfile.deviceId,
          rateType: alertForm.rateType,
          condition: alertForm.condition,
          targetRate: alertForm.targetRate,
          language,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Unable to save alert");
      setAlertForm((prev) => ({ ...prev, targetRate: "" }));
      setEditingAlertId("");
      setAlertMessage(editingId ? t.alertUpdated : t.alertSaved);
      await loadTargetAlerts();
    } catch (err) {
      setAlertMessage(err.message || "Unable to save alert");
    }
  }

  async function removeTargetAlert(id) {
    if (!dealerProfile?.phone || !dealerProfile?.deviceId) return;

    try {
      const params = new URLSearchParams({
        id,
        phone: dealerProfile.phone,
        deviceId: dealerProfile.deviceId,
      });
      const res = await fetch(`/api/target-alerts?${params.toString()}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Unable to remove alert");
      setAlertMessage(t.alertRemoved);
      if (editingAlertId === id) cancelEditTargetAlert();
      await loadTargetAlerts();
    } catch (err) {
      setAlertMessage(err.message || "Unable to remove alert");
    }
  }

  function startEditTargetAlert(alert) {
    setEditingAlertId(alert.id);
    setAlertListTab("active");
    setAlertForm({
      rateType: alert.rateType || "silver_mcx_buy",
      condition: alert.condition || "below_equal",
      targetRate: String(alert.targetRate || ""),
    });
    setAlertMessage("Editing active alert.");
  }

  function cancelEditTargetAlert() {
    setEditingAlertId("");
    setAlertForm({
      rateType: "silver_mcx_buy",
      condition: "below_equal",
      targetRate: "",
    });
    setAlertMessage("");
  }

  async function checkTargetAlerts(data) {
    if (targetCheckInProgressRef.current) return;
    const rates = getAlertRatesFromQuote(data);
    if (!Object.values(rates).some((value) => Number.isFinite(value) && value > 0)) return;

    targetCheckInProgressRef.current = true;
    try {
      await fetch("/api/target-alerts/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rates }),
        cache: "no-store",
      });
      await loadTargetAlerts();
    } catch (err) {
      console.error(err);
    } finally {
      targetCheckInProgressRef.current = false;
    }
  }

  async function sendVolatilityNotification(payload) {
    try {
      await fetch("/api/notifications/volatility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch (err) {
      console.error("Volatility notification failed", err);
    }
  }

  async function submitFeedback() {
    const text = feedbackText.trim();
    if (!text) {
      setFeedbackMessage("Please enter feedback before submitting.");
      return;
    }

    setFeedbackLoading(true);
    setFeedbackMessage("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: dealerProfile?.phone || "",
          name: dealerProfile?.name || "",
          message: text,
          source: "sidebar",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Unable to submit feedback");
      setFeedbackText("");
      setFeedbackMessage(t.feedbackSuccess);
    } catch (err) {
      setFeedbackMessage(err.message || "Unable to submit feedback");
    } finally {
      setFeedbackLoading(false);
    }
  }

  useEffect(() => {
    if (accessGranted && dealerProfile?.phone) {
      loadTargetAlerts();
    }
  }, [accessGranted, dealerProfile?.phone, dealerProfile?.deviceId]);

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
    if (!accessGranted) {
      setSettings(null);
      setQuote(null);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "settings", "bullion"),
      (snapshot) => {
        setSettings(snapshot.data());
      }
    );

    return () => unsub();
  }, [accessGranted]);

  useEffect(() => {
    const clock = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    volatilityUntilRef.current = volatilityUntil;
  }, [volatilityUntil]);

  useEffect(() => {
    if (!showWelcomeCard) {
      return;
    }

    const timer = setTimeout(() => {
      setShowWelcomeCard(false);
    }, 6500);

    return () => clearTimeout(timer);
  }, [showWelcomeCard]);

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

  const baseRefreshSeconds = Math.max(
  1,
  Number(settings.refreshrate || 5)
);
   return {
  withinMarketHours:
    currentMinutes >= startMinutes &&
    currentMinutes < endMinutes,
  shouldShowRates:
    Boolean(settings.showRates) &&
    currentMinutes >= startMinutes &&
    currentMinutes < endMinutes,
  refreshMs: baseRefreshSeconds * 1000,
};
  }, [settings, now]);

const activeVolatilityUntil =
  Math.max(Number(volatilityUntil || 0), Number(serverVolatilityUntil || 0));

const isVolatilityActive =
  settings?.volatilityWarningEnabled &&
  activeVolatilityUntil &&
  Date.now() < activeVolatilityUntil;

 const effectiveRefreshMs = settings?.holidayMode
  ? 900 * 1000
  : isVolatilityActive
  ? 1 * 1000
  : marketState.shouldShowRates
  ? marketState.refreshMs
  : 900 * 1000;

  useEffect(() => {
    if (!accessGranted || !settings || settings?.maintenanceMode) {
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

        setRateMovements(buildRateMovements(data, previousQuoteRef.current));
        previousQuoteRef.current = data;
        setQuote(data);
        if (targetAlerts.length > 0) {  checkTargetAlerts(data); }

        const currentBuyPrice = Number(data.mcxBuyPrice);

        if (Number.isFinite(currentBuyPrice) && currentBuyPrice > 0) {
          setPriceHistory((prev) => {
            const nowMs = Date.now();
            const safePrev = Array.isArray(prev) ? prev : [];

            const updated = [
              ...safePrev,
              {
                price: currentBuyPrice,
                time: nowMs,
              },
            ].filter((item) => nowMs - item.time <= 40 * 1000);

            if (updated.length > 1) {
              const prices = updated.map((item) => item.price);

              const highest = Math.max(...prices);
              const lowest = Math.min(...prices);
              const movement = highest - lowest;

              const alreadyActive =
                volatilityUntilRef.current &&
                nowMs < volatilityUntilRef.current;

              if (
                movement >= 650 &&
                settings?.volatilityWarningEnabled
              ) {
                const warningUntil = nowMs + 10 * 60 * 1000;

                volatilityUntilRef.current = warningUntil;
                setVolatilityUntil(warningUntil);

                if (
                  !alreadyActive &&
                  !volatilityLogInProgressRef.current
                ) {
                  volatilityLogInProgressRef.current = true;

                  const volatilityPayload = {
                    contract: data.contract,
                    currentPrice: currentBuyPrice,
                    highest,
                    lowest,
                    movement,
                  };

                  Promise.all([
                    logVolatilityTrigger(volatilityPayload),
                    sendVolatilityNotification(volatilityPayload),
                  ]).finally(() => {
                    volatilityLogInProgressRef.current = false;
                  });
                }
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

    const interval = setInterval(fetchQuote, effectiveRefreshMs);

    return () => clearInterval(interval);
 }, [
  accessGranted,
  settings,
  marketState.shouldShowRates,
  marketState.refreshMs,
  settings?.holidayMode,
  effectiveRefreshMs,
  targetAlerts.length,
]);

  if (!accessGranted) {
    return (
      <DealerAccessGate
        theme={theme}
        logoSrc={logoSrc}
        onAccessGranted={handleAccessGranted}
      />
    );
  }

  if (!settings) {
      return <LoadingScreen theme={theme} logoSrc={logoSrc} />;
  }

  if (settings?.maintenanceMode) {
    return (
      <MaintenanceScreen theme={theme} logoSrc={logoSrc} t={t} settings={settings}>
        <SideBarMenu
          theme={theme}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          toggleTheme={toggleTheme}
          screenAwake={screenAwake}
          toggleScreenAwake={toggleScreenAwake}
          now={now}
          quote={quote}
          settings={settings}
          marketState={marketState}
          dealerProfile={dealerProfile}
          onDealerLogout={handleDealerLogout}
          t={t}
          onFeedbackOpen={() => setFeedbackOpen(true)}
          onEnableNotifications={registerPushToken}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </MaintenanceScreen>
    );
  }

  if (activeTab === "alerts") {
    return (
      <div style={themeTokens[theme]}>
        <SideBarMenu
          theme={theme}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          toggleTheme={toggleTheme}
          screenAwake={screenAwake}
          toggleScreenAwake={toggleScreenAwake}
          now={now}
          quote={quote}
          settings={settings}
          marketState={marketState}
          dealerProfile={dealerProfile}
          onDealerLogout={handleDealerLogout}
          t={t}
          onFeedbackOpen={() => setFeedbackOpen(true)}
          onEnableNotifications={registerPushToken}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
        <AlertsPage
          theme={theme}
          logoSrc={logoSrc}
          t={t}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          alertForm={alertForm}
          setAlertForm={setAlertForm}
          alerts={targetAlerts}
          triggeredAlerts={triggeredAlerts}
          alertListTab={alertListTab}
          setAlertListTab={setAlertListTab}
          editingAlertId={editingAlertId}
          alertMessage={alertMessage}
          saveTargetAlert={saveTargetAlert}
          removeTargetAlert={removeTargetAlert}
          refreshAlerts={loadTargetAlerts}
          startEditTargetAlert={startEditTargetAlert}
          cancelEditTargetAlert={cancelEditTargetAlert}
        />
        <FeedbackModal
          visible={feedbackOpen}
          t={t}
          feedbackText={feedbackText}
          setFeedbackText={setFeedbackText}
          feedbackMessage={feedbackMessage}
          onSubmit={submitFeedback}
          onClose={() => setFeedbackOpen(false)}
          loading={feedbackLoading}
        />
      </div>
    );
  }

  if (settings?.holidayMode) {
  return (
    <main style={pageStyle}>
<SideBarMenu
  theme={theme}
  sidebarOpen={sidebarOpen}
  setSidebarOpen={setSidebarOpen}
  toggleTheme={toggleTheme}
  screenAwake={screenAwake}
  toggleScreenAwake={toggleScreenAwake}
  now={now}
  quote={quote}
  settings={settings}
  marketState={marketState}
  dealerProfile={dealerProfile}
  onDealerLogout={handleDealerLogout}
  t={t}
  onFeedbackOpen={() => setFeedbackOpen(true)}
  onEnableNotifications={registerPushToken}
  viewMode={viewMode}
  setViewMode={setViewMode}
/>
      <section style={styles.hero}>
        <Image src={logoSrc}  alt="Ronak Jewellers"   width={250}  height={250}  style={styles.logoImage} />
        <h1 style={styles.brandName}>•Ronak Jewellers•</h1>
    {settings.noticeMessage?.trim() ? (
  <div style={styles.statusRow}>
  <div style={{ marginTop: 16 }}>  <span style={styles.liveDot} />
     </div> <CustomNotice message={settings.noticeMessage} />
  </div>
) : null}

        <WelcomeToast profile={dealerProfile} visible={showWelcomeCard} t={t} />
    </section>

  {fetchError ? <div style={styles.errorBox}>{fetchError}</div> : null}
      
  <section style={styles.mainCard}>
       <div style={{ padding : '0px 20px' }}> <h2> S I L V E R - 9 9</h2></div> 
         <div style={styles.rateGrid}>
          <div style={styles.sideCard}>
    
            <p style={styles.finalLabel}>Buying Rate</p>
            <h1 style={styles.finalPrice}>
              ₹ {formatPrice(settings.holidayBuyingRate)}
              <span style={styles.unit}> /kg</span>
            </h1>
          </div>

          <div style={styles.sideCard}>
            <p style={styles.finalLabel}>Selling Rate</p>
            <h1 style={styles.finalPrice}>
              ₹ {formatPrice(settings.holidaySellingRate)}
              <span style={styles.unit}> /kg</span>
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
  <p style={styles.disclaimer}>{t.finalDisclaimer}</p>
  <BottomTabs activeTab={activeTab} setActiveTab={setActiveTab} t={t} />
  <FeedbackModal visible={feedbackOpen} t={t} feedbackText={feedbackText} setFeedbackText={setFeedbackText} feedbackMessage={feedbackMessage} onSubmit={submitFeedback} onClose={() => setFeedbackOpen(false)} loading={feedbackLoading} />
</main>
);
}

  if (!marketState.shouldShowRates) {
    return (
    <ClosedScreen theme={theme} logoSrc={logoSrc} t={t}>
<SideBarMenu
  theme={theme}
  sidebarOpen={sidebarOpen}
  setSidebarOpen={setSidebarOpen}
  toggleTheme={toggleTheme}
  screenAwake={screenAwake}
  toggleScreenAwake={toggleScreenAwake}
  now={now}
  quote={quote}
  settings={settings}
  marketState={marketState}
  dealerProfile={dealerProfile}
  onDealerLogout={handleDealerLogout}
  t={t}
  onFeedbackOpen={() => setFeedbackOpen(true)}
  onEnableNotifications={registerPushToken}
  viewMode={viewMode}
  setViewMode={setViewMode}
/>
    </ClosedScreen>
  );
  }

 if (!quote) {
  return (
    <main style={centerPageStyle}>
      <Image   src={logoSrc}   alt="Ronak Jewellers"   width={250}   height={250}   style={styles.logoImage} />

      <h1 style={styles.brandName}>
       Ronak Jewellers
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

const compactRateRows = [
  {
    id: "silver99",
    title: "SILVER 99 [SA Chorsa]",
    compactTitle: "Silver 99",
    mcxBuy: quote.mcxBuyPrice,
    mcxSell: quote.mcxSellPrice,
    buyPremium: settings.showPremium ? buyingPremium : null,
    sellPremium: settings.showPremium ? sellingPremium : null,
    finalBuying,
    finalSelling,
    buyMovement: rateMovements.silverMcxBuy,
    sellMovement: rateMovements.silverMcxSell,
  },
  ...(settings.silver100rate
    ? [
        {
          id: "silver100",
          title: "SILVER 100 [PetiCut]",
          compactTitle: "Silver 100",
          mcxBuy: quote.mcxBuyPrice,
          mcxSell: quote.mcxSellPrice,
          buyPremium: settings.showPremium ? buyingPremium + silver100BuyPremium : null,
          sellPremium: settings.showPremium ? sellingPremium + silver100SellPremium : null,
          finalBuying: silver100Buying,
          finalSelling: silver100Selling,
          buyMovement: rateMovements.silverMcxBuy,
          sellMovement: rateMovements.silverMcxSell,
        },
      ]
    : []),
  ...(Boolean(settings.ShowGoldRate) && !quote.goldError
    ? [
        {
          id: "gold995",
          title: "GOLD 995",
          compactTitle: "Gold 995",
          mcxBuy: quote.goldMcxBuyPrice,
          mcxSell: quote.goldMcxSellPrice,
          buyPremium: settings.ShowGoldPrem ? goldBuyPremium : null,
          sellPremium: settings.ShowGoldPrem ? goldSellPremium : null,
          finalBuying: goldFinalBuying,
          finalSelling: goldFinalSelling,
          buyMovement: rateMovements.goldMcxBuy,
          sellMovement: rateMovements.goldMcxSell,
        },
      ]
    : []),
];

return (
    <main style={pageStyle}>
<SideBarMenu
  theme={theme}
  sidebarOpen={sidebarOpen}
  setSidebarOpen={setSidebarOpen}
  toggleTheme={toggleTheme}
  screenAwake={screenAwake}
  toggleScreenAwake={toggleScreenAwake}
  now={now}
  quote={quote}
  settings={settings}
  marketState={marketState}
  dealerProfile={dealerProfile}
  onDealerLogout={handleDealerLogout}
  t={t}
  onFeedbackOpen={() => setFeedbackOpen(true)}
  onEnableNotifications={registerPushToken}
  viewMode={viewMode}
  setViewMode={setViewMode}
/>
      <section style={styles.hero}>
        <Image   src={logoSrc}   alt="Ronak Jewellers"   width={250}   height={250}   style={styles.logoImage} />

        <h2 style={styles.brandName}>Ronak Jewellers</h2>
        <div style={styles.statusRow}>
          <span style={styles.live} />
          <span>{t.liveBullion}</span>
        </div>
     <p>  <CustomNotice message={settings.noticeMessage} /> </p>

        <WelcomeToast profile={dealerProfile} visible={showWelcomeCard} t={t} />
    </section>
  
<div style={styles.metaItem}>
  <span>Last Updated: {formatCurrentTime(now)}</span>
</div>
{fetchError ? <div style={styles.errorBox}>{fetchError}</div> : null}

{isVolatilityActive ? (
  <div style={styles.volatilityWarning}>
    <strong>{t.volatilityTitle}</strong>
    <br />
    {t.volatilityBody}
  </div>
) : null}

{viewMode === "compact" ? (
  <CompactRatesTable rows={compactRateRows} />
) : (
  <>
<ProductPanel
  id="silver99"
  title="SILVER 99 [SA Chorsa]"
  openProducts={openProducts}
  setOpenProducts={setOpenProducts}
>
    <div style={styles.rateGrid}>
          <div style={styles.sideCard}>
            <p style={styles.label}>MCX Buy</p>
            <h2 style={{ ...styles.mcxPrice, ...styles.mcxPriceWithMovement }}>
              <span>₹ {formatPrice(quote.mcxBuyPrice)}<span style={styles.unit}> /kg</span></span>
              <MovementBadge movement={rateMovements.silverMcxBuy} />
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
              <span style={styles.unit}> /kg</span>
            </h1>
          </div>

          <div style={styles.sideCard}>
            <p style={styles.label}>MCX Sell</p>
            <h2 style={{ ...styles.mcxPrice, ...styles.mcxPriceWithMovement }}>
              <span>₹ {formatPrice(quote.mcxSellPrice)}<span style={styles.unit}> /kg</span></span>
              <MovementBadge movement={rateMovements.silverMcxSell} />
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
      <h2 style={{ ...styles.mcxPrice, ...styles.mcxPriceWithMovement }}>
        <span>₹ {formatPrice(quote.mcxBuyPrice)}<span style={styles.unit}> /kg</span></span>
        <MovementBadge movement={rateMovements.silverMcxBuy} />
      </h2>   

      <p style={styles.finalLabel}>WE BUY AT:</p>
      <h1 style={styles.finalPrice}>
        ₹ {formatPrice(silver100Buying)}
        <span style={styles.unit}> /kg</span>
      </h1>
    </div>

    <div style={styles.sideCard}>
      <p style={styles.label}>MCX Sell</p>
      <h2 style={{ ...styles.mcxPrice, ...styles.mcxPriceWithMovement }}>
        <span>₹ {formatPrice(quote.mcxSellPrice)}<span style={styles.unit}> /kg</span></span>
        <MovementBadge movement={rateMovements.silverMcxSell} />
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
        <h2 style={{ ...styles.mcxPrice, ...styles.mcxPriceWithMovement }}>
          <span>₹ {formatPrice(quote.goldMcxBuyPrice)}<span style={styles.unit}> /10gm</span></span>
          <MovementBadge movement={rateMovements.goldMcxBuy} />
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
          <span style={styles.unit}> /10gm</span>
        </h1>
      </div>

      <div style={styles.sideCard}>
        <p style={styles.label}>MCX Sell</p>
        <h2 style={{ ...styles.mcxPrice, ...styles.mcxPriceWithMovement }}>
          <span>₹ {formatPrice(quote.goldMcxSellPrice)}<span style={styles.unit}> /10gm</span></span>
          <MovementBadge movement={rateMovements.goldMcxSell} />
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
          <span style={styles.unit}> /10gm</span>
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
  </>
)}    
<KachhiBadla settings={settings} />
 <ContactButtons />
 <InstallPWAButton />               
  <p style={styles.disclaimer}>{t.finalDisclaimer}</p>
  <BottomTabs activeTab={activeTab} setActiveTab={setActiveTab} t={t} />
  <FeedbackModal visible={feedbackOpen} t={t} feedbackText={feedbackText} setFeedbackText={setFeedbackText} feedbackMessage={feedbackMessage} onSubmit={submitFeedback} onClose={() => setFeedbackOpen(false)} loading={feedbackLoading} />
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
          ? `₹${formatPrice(settings.kachhiBadlaValue)} /kg`
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
      <p style={styles.muted}>Loading live rates...</p>
    </main>
  );
}

function ClosedScreen({ theme = "dark", logoSrc = "/logo.png", t = translations.en, children }) {
  return (
    <main style={{ ...styles.pageCenter, ...themeTokens[theme] }}>
      {children}
      <Image   src={logoSrc}   alt="Ronak Jewellers"   width={250}   height={250}   style={styles.logoImage} />
      <h1 style={styles.brandName}>• Ronak Jewellers •</h1>
      <div style={styles.closedCard}>
        <h2 style={styles.closedTitle}>
          {t.ratesUnavailable}
        </h2>
        <p style={styles.muted}>
         {t.visitAgain}
        </p>
      </div>
  <InstallPWAButton />
    </main>
  );
}
const styles = {
  menuButton: {
    position: "fixed",
    top: 18,
    right: 16,
    zIndex: 1001,
    width: 46,
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(214,180,92,0.45)",
    background: "rgba(10,10,10,0.78)",
    color: "#f3d98b",
    fontSize: 25,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    transition: "all 0.25s ease",
    animation: "rjMenuPop 0.3s ease both",
  },

  menuButtonLight: {
    position: "fixed",
    top: 18,
    right: 16,
    zIndex: 1001,
    width: 46,
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(105,75,20,0.35)",
    background: "rgba(255,234,190,0.9)",
    color: "#3b2a08",
    fontSize: 25,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 10px 28px rgba(120,85,20,0.22)",
    transition: "all 0.25s ease",
    animation: "rjMenuPop 0.3s ease both",
  },

  sidebarOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    zIndex: 1002,
    animation: "rjOverlayFade 0.25s ease both",
  },

  sidebar: {
    position: "fixed",
    fontFamily: "Arial, Helvetica, sans-serif",
    top: 0,
    right: 0,
    width: "min(84vw, 350px)",
    height: "100vh",
    zIndex: 1003,
    background:
      "linear-gradient(145deg, rgba(22,22,22,0.98), rgba(5,5,5,0.98))",
    borderLeft: "1px solid rgba(214,180,92,0.35)",
    boxShadow: "-20px 0 60px rgba(0,0,0,0.55)",
    color: "#f3d98b",
    padding: "22px 18px",
    boxSizing: "border-box",
    transition:
      "transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), background 0.35s ease",
    overflowY: "auto",
  },

  sidebarLight: {
    position: "fixed",
    fontFamily: "Arial, Helvetica, sans-serif",
    top: 0,
    right: 0,
    width: "min(84vw, 350px)",
    height: "100vh",
    zIndex: 1003,
    background: "linear-gradient(145deg, #FFEABE, #fff5d8)",
    color: "#3b2a08",
    padding: "22px 18px",
    boxSizing: "border-box",
    transition:
      "transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), background 0.35s ease",
    borderLeft: "1px solid rgba(105,75,20,0.28)",
    boxShadow: "-20px 0 60px rgba(120,85,20,0.24)",
    overflowY: "auto",
  },

  sidebarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    fontSize: 20,
    letterSpacing: "0.05em",
    marginBottom: 24,
  },

  sidebarSubTitle: {
    margin: "6px 0 0",
    color: "var(--rj-muted)",
    fontSize: 12,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  sidebarClose: {
    border: "none",
    background: "rgba(255,255,255,0.08)",
    color: "#f3d98b",
    width: 38,
    height: 38,
    borderRadius: 12,
    fontSize: 26,
    cursor: "pointer",
    transition: "transform 0.22s ease, background 0.22s ease",
  },

  sidebarCloseLight: {
    border: "none",
    background: "rgba(80,50,10,0.08)",
    color: "#3b2a08",
    width: 38,
    height: 38,
    borderRadius: 12,
    fontSize: 26,
    cursor: "pointer",
    transition: "transform 0.22s ease, background 0.22s ease",
  },

  sidebarSection: {
    padding: "16px 0",
    borderTop: "1px solid rgba(214,180,92,0.18)",
    animation: "rjSidebarItem 0.42s ease both",
  },

  sidebarLabel: {
    display: "block",
    color: "#aaa",
    fontSize: 13,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    marginBottom: 12,
  },

  sidebarLabelLight: {
    display: "block",
    color: "#6d521c",
    fontSize: 13,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    marginBottom: 12,
  },

  sidebarInfoCard: {
    fontFamily: "Arial, Helvetica, sans-serif",
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-card-bg)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "var(--rj-soft-shadow)",
  },

  sidebarStatusRow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    color: "var(--rj-brand)",
  },

  sidebarMiniText: {
    margin: "8px 0 0",
    color: "var(--rj-muted)",
    fontSize: 13,
  },

  sidebarMiniGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },

  sidebarAction: {
    display: "block",
    fontFamily: "Arial, Helvetica, sans-serif",
    textDecoration: "none",
    color: "var(--rj-brand)",
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-call-bg)",
    boxShadow: "var(--rj-call-shadow)",
    borderRadius: 14,
    padding: "12px 14px",
    marginBottom: 10,
    fontWeight: 800,
    letterSpacing: "0.03em",
  },

  sidebarInstallWrap: {
    marginTop: 8,
  },

  sidebarDisclaimer: {
    margin: 0,
    color: "var(--rj-muted)",
    fontSize: 13,
    lineHeight: 1.6,
  },

  page: {
    minHeight: "100vh",
    background: "var(--rj-page-bg)",
    color: "var(--rj-text)",
    fontFamily: "Arial, Helvetica, sans-serif",
    padding: "28px 18px 40px",
    boxSizing: "border-box",
    transition: "background 0.45s ease, color 0.45s ease",
  },

  pageCenter: {
    minHeight: "100vh",
    background: "var(--rj-page-bg)",
    color: "var(--rj-text)",
    fontFamily: "Arial, Helvetica, sans-serif",
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
    transition:
      "background 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease",
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
    transition:
      "max-height 0.35s ease, opacity 0.25s ease, padding 0.35s ease",
  },

  themeToggleWrap: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-toggle-bg)",
    color: "var(--rj-brand)",
    transition:
      "background 0.35s ease, border-color 0.35s ease, color 0.35s ease",
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
    transition:
      "background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
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
    transition:
      "transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), background 0.35s ease",
    willChange: "transform",
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

  kachhiValue: {
    fontSize: 29,
    fontWeight: 600,
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
    marginBottom: 15,
    merginLeft: 10,
    transition: "background 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease",
  },

  disclaimer: {
    marginTop: 26,
    marginBottom: 31,
    color: "var(--rj-muted)",
    fontSize: 13,
    textAlign: "center",
    maxWidth: 800,
    lineHeight: 1.7,
    marginLeft: "auto",
    marginRight: "auto",
    padding: "0 12px",
  },

  label: {
    margin: "0 0 7px",
    color: "var(--rj-label)",
    fontSize: 13,
    letterSpacing: "0.11em",
    textTransform: "uppercase",
  },

  rateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    padding: "7px 8px",
    gap: 18,
  },

  sideCard: {
    background: "var(--rj-card-bg)",
    border: "1px solid var(--rj-card-border)",
    borderRadius: 22,
    padding: 20,
    transition:
      "background 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease, transform 0.25s ease",
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
    marginBottom: -3,
    color: "var(--rj-muted)",
    fontSize: 13,
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

  welcomeToast: {
    position: "fixed",
    top: "calc(env(safe-area-inset-top, 0px) + 72px)",
    left: 16,
    right: 16,
    overflow: "hidden",
    zIndex: 950,
    width: "min(500px, calc(100vw - 32px))",
    margin: "0 auto",
    background: "var(--rj-toast-bg)",
    backdropFilter: "blur(18px) saturate(130%)",
    WebkitBackdropFilter: "blur(18px) saturate(130%)",
    border: "1px solid var(--rj-toast-border)",
    boxShadow: "var(--rj-toast-shadow)",
    color: "var(--rj-brand)",
    borderRadius: 24,
    padding: "16px 20px 15px",
    textAlign: "center",
    lineHeight: 1.45,
    boxSizing: "border-box",
    pointerEvents: "none",
    animation: "rjWelcomeCard 6.4s cubic-bezier(0.22, 1, 0.36, 1) both",
    willChange: "opacity, transform, filter",
  },

  welcomeShine: {
    position: "absolute",
    top: "-40%",
    left: 0,
    width: "42%",
    height: "180%",
    background:
      "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)",
    animation: "rjWelcomeShine 2.2s ease 0.35s both",
    pointerEvents: "none",
  },

  welcomeTitle: {
    position: "relative",
    fontSize: "clamp(18px, 4.8vw, 25px)",
    fontWeight: 900,
    letterSpacing: 0.2,
  },

  welcomeSubtitle: {
    position: "relative",
    marginTop: 3,
    color: "var(--rj-muted)",
    fontSize: "clamp(13px, 3.6vw, 15px)",
    fontWeight: 600,
  },

  welcomePhone: {
    position: "relative",
    marginTop: 6,
    color: "var(--rj-muted)",
    fontSize: 13,
    fontWeight: 700,
  },

  errorBox: {
    margin: "0 auto 18px",
    maxWidth: 760,
    padding: 14,
    borderRadius: 14,
    color: "#ffd6d6",
    background: "rgba(120, 20, 20, 0.35)",
    border: "1px solid rgba(255, 120, 120, 0.25)",
  },
  bottomTabs: {
    position: "fixed",
    left: "50%",
    bottom: -3,
    transform: "translateX(-50%)",
    width: "min(92vw, 420px)",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    padding: 8,
    borderRadius: 9,
    border: "2px solid var(--rj-panel-border)",
    background: "var(--rj-floating-bg)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    zIndex: 998,
    boxShadow: "var(--rj-floating-shadow)",
  },
  bottomTab: {
    border: "1px solid var(--rj-card-border)",
    background: "var(--rj-tab-bg)",
    color: "var(--rj-muted)",
    borderRadius: 14,
    padding: "12px 10px",
    fontWeight: 800,
    cursor: "pointer",
  },
  bottomTabActive: {
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-call-bg)",
    color: "var(--rj-brand)",
    borderRadius: 14,
    padding: "12px 10px",
    fontWeight: 900,
    cursor: "pointer",
  },
  languageSelect: {
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-card-bg)",
    color: "var(--rj-brand)",
    borderRadius: 10,
    padding: "8px 10px",
    fontWeight: 700,
  },
  alertFormGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 12,
    padding: 12,
    marginTop: 14,
  },
  alertLabel: {
    display: "block",
    color: "var(--rj-label)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 7,
  },
  alertInput: {
    width: "100%",
    boxSizing: "border-box",
    background: "var(--rj-card-bg)",
    border: "1px solid var(--rj-panel-border)",
    color: "var(--rj-brand)",
    borderRadius: 12,
    padding: "12px 12px",
  },
  alertSaveButton: {
    alignSelf: "end",
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-call-bg)",
    color: "var(--rj-brand)",
    borderRadius: 12,
    padding: "12px 14px",
    fontWeight: 900,
    cursor: "pointer",
  },
  alertListHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  alertCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
    border: "1px solid var(--rj-card-border)",
    background: "var(--rj-card-bg)",
    borderRadius: 18,
    padding: 24,
    marginTop: 10,
  },
  removeAlertButton: {
    border: "1px solid var(--rj-danger-border)",
    background: "var(--rj-danger-bg)",
    color: "var(--rj-danger-text)",
    borderRadius: 9,
    padding: "10px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  smallActionButton: {
    border: "1px solid var(--rj-panel-border)",
    background: "rgba(214,180,92,0.08)",
    color: "var(--rj-brand)",
    borderRadius: 10,
    padding: "8px 10px",
    cursor: "pointer",
  },
  mutedSmall: {
    margin: "6px 0 0",
    color: "var(--rj-muted)",
    fontSize: 13,
  },
  messageText: {
    color: "var(--rj-brand)",
    textAlign: "center",
    marginTop: 14,
  },
  feedbackOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.52)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  feedbackModal: {
    width: "min(94vw, 430px)",
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-main-card-bg)",
    color: "var(--rj-brand)",
    borderRadius: 20,
    padding: 18,
    boxShadow: "var(--rj-soft-shadow)",
  },
  feedbackTextarea: {
    width: "100%",
    boxSizing: "border-box",
    background: "var(--rj-card-bg)",
    color: "var(--rj-brand)",
    border: "1px solid var(--rj-panel-border)",
    borderRadius: 14,
    padding: 12,
    resize: "vertical",
  },
  primaryFeedbackButton: {
    width: "100%",
    marginTop: 12,
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-call-bg)",
    color: "var(--rj-brand)",
    borderRadius: 14,
    padding: "12px 14px",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryFeedbackButton: {
    width: "100%",
    marginTop: 10,
    border: "1px solid var(--rj-card-border)",
    background: "transparent",
    color: "var(--rj-muted)",
    borderRadius: 14,
    padding: "11px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  feedbackMessage: {
    color: "var(--rj-brand)",
    textAlign: "center",
    marginBottom: 0,
  },
  movementBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    marginLeft: 5,
    padding: "2px 5px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    lineHeight: 1.1,
    whiteSpace: "nowrap",
  },
  movementUp: {
    border: "1px solid rgba(80,200,120,0.38)",
    background: "rgba(40,150,80,0.15)",
    color: "#84e0a3",
  },
  movementDown: {
    border: "1px solid rgba(255,120,120,0.38)",
    background: "rgba(155,44,44,0.18)",
    color: "#ffaaaa",
  },
  movementFlat: {
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-tab-bg)",
    color: "var(--rj-muted)",
  },
  mcxPriceWithMovement: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  viewModeRow: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6,
    padding: 5,
    borderRadius: 14,
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-floating-bg)",
    boxSizing: "border-box",
  },
  viewModeButton: {
    border: "1px solid var(--rj-card-border)",
    background: "var(--rj-tab-bg)",
    color: "var(--rj-muted)",
    borderRadius: 11,
    padding: "9px 8px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  viewModeButtonActive: {
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-call-bg)",
    color: "var(--rj-brand)",
    borderRadius: 11,
    padding: "9px 8px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  compactTableWrap: {
    width: "100%",
    maxWidth: 520,
    margin: "8px auto 10px",
    border: "1px solid var(--rj-panel-border)",
    borderRadius: 10,
    overflowX: "hidden",
    background: "var(--rj-main-card-bg)",
    boxShadow: "0 14px 38px rgba(0,0,0,0.28)",
  },
  compactTable: {
    width: "100%",
    tableLayout: "fixed",
    borderCollapse: "collapse",
    color: "var(--rj-brand)",
    textAlign: "center",
  },
  compactTh: {
    padding: "7px 3px",
    borderBottom: "1.5px solid var(--rj-panel-border)",
    borderLeft: "1px solid var(--rj-card-border)",
    color: "var(--rj-brand)",
    fontSize: "clamp(10px, 2.6vw, 13px)",
    fontWeight: 800,
    textAlign: "center",
    whiteSpace: "nowrap",
    letterSpacing: "0.01em",
  },
  compactTd: {
    padding: "5px 1px",
    borderBottom: "1px solid var(--rj-card-border)",
    borderLeft: "1px solid var(--rj-card-border)",
    fontSize: "clamp(12px, 3vw, 15px)",
    fontWeight: 550,
    whiteSpace: "nowrap",
    textAlign: "center",
    lineHeight: 1.1,
  },
  compactSideCell: {
    padding: "7px 2px",
    borderBottom: "1px solid var(--rj-card-border)",
    borderLeft: "1px solid var(--rj-card-border)",
    fontSize: "clamp(11px, 2.8vw, 14px)",
    fontWeight: 800,
    whiteSpace: "nowrap",
    textAlign: "center",
    lineHeight: 1.1,
  },
  compactFinalTd: {
    padding: "7px 3px",
    borderBottom: "1px solid var(--rj-card-border)",
    borderLeft: "1px solid var(--rj-card-border)",
    fontSize: "clamp(12px, 3vw, 15px)",
    fontWeight: 900,
    color: "var(--rj-final)",
    whiteSpace: "nowrap",
    textAlign: "center",
    lineHeight: 1.1,
  },
  compactProductCell: {
    padding: "7px 3px",
    borderBottom: "1.5px solid var(--rj-panel-border)",
    fontSize: "clamp(12px, 3vw, 15px)",
    fontWeight: 900,
    whiteSpace: "normal",
    textAlign: "center",
    verticalAlign: "middle",
    lineHeight: 1.08,
  },
  alertTabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    padding: "0 12px 12px",
  },
  alertTab: {
    border: "1px solid var(--rj-card-border)",
    background: "var(--rj-tab-bg)",
    color: "var(--rj-muted)",
    borderRadius: 12,
    padding: "10px 8px",
    fontWeight: 800,
    cursor: "pointer",
  },
  alertTabActive: {
    border: "1px solid var(--rj-panel-border)",
    background: "var(--rj-call-bg)",
    color: "var(--rj-brand)",
    borderRadius: 12,
    padding: "10px 8px",
    fontWeight: 900,
    cursor: "pointer",
  },
  alertActionRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  maintenanceCard: {
    width: "100%",
    maxWidth: 560,
    marginTop: 22,
    background: "var(--rj-main-card-bg)",
    border: "1px solid var(--rj-main-card-border)",
    borderRadius: 24,
    padding: 24,
    boxSizing: "border-box",
    boxShadow: "var(--rj-soft-shadow)",
  }

};

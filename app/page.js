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
    liveBullion: "LIVE BULLION RATES",
    finalDisclaimer: "Rates displayed are based on market conditions and applicable premiums. Final rates may vary depending on confirmation at the time of enquiry.",
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
  alertMessage,
  saveTargetAlert,
  removeTargetAlert,
  refreshAlerts,
}) {
  return (
    <main style={{ ...styles.page, ...themeTokens[theme], paddingBottom: 105 }}>
      <section style={styles.hero}>
        <Image src={logoSrc} alt="Ronak Jewellers" width={250} height={250} style={styles.logoImage} />
        <h2 style={styles.brandName}>Ronak Jewellers</h2>
      </section>

      <section style={styles.mainCard}>
        <h2>{t.alertsTitle}</h2>
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
            {t.saveAlert}
          </button>
        </div>

        {alertMessage ? <p style={styles.messageText}>{alertMessage}</p> : null}

        <div style={styles.alertListHeader}>
          <strong>{t.myAlerts}</strong>
          <button type="button" style={styles.smallActionButton} onClick={refreshAlerts}>Refresh</button>
        </div>

        {alerts.length === 0 ? (
          <p style={styles.muted}>{t.noAlerts}</p>
        ) : (
          alerts.map((alert) => {
            const rateOption = RATE_ALERT_OPTIONS.find((option) => option.value === alert.rateType);
            return (
              <div key={alert.id} style={styles.alertCard}>
                <div>
                  <strong>{rateOption?.label || alert.rateType}</strong>
                  <p style={styles.mutedSmall}>
                    {alert.condition === "below_equal" ? "≤" : "≥"} ₹ {formatPrice(alert.targetRate)}
                  </p>
                </div>
                <button type="button" style={styles.removeAlertButton} onClick={() => removeTargetAlert(alert.id)}>
                  {t.remove}
                </button>
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


  async function registerPushToken() {
    try {
      if (!dealerProfile?.phone || !dealerProfile?.deviceId) {
        return false;
      }

      const supported = await isSupported().catch(() => false);
      if (!supported || typeof window === "undefined" || !("Notification" in window)) {
        setAlertMessage(t.notificationUnsupported);
        return false;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setAlertMessage(t.notificationDenied);
        return false;
      }

      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
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

      setAlertMessage(t.notificationEnabled);
      return true;
    } catch (err) {
      console.error(err);
      setAlertMessage(err.message || t.notificationUnsupported);
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
      if (data.success) setTargetAlerts(data.alerts || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function saveTargetAlert() {
    if (!dealerProfile?.phone || !dealerProfile?.deviceId) return;

    setAlertMessage("");
    try {
      await registerPushToken();

      const res = await fetch("/api/target-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      setAlertMessage(t.alertSaved);
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
      await loadTargetAlerts();
    } catch (err) {
      setAlertMessage(err.message || "Unable to remove alert");
    }
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
    if (!accessGranted || !settings) {
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
        checkTargetAlerts(data);

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

  if (activeTab === "alerts") {
    return (
      <>
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
          alertMessage={alertMessage}
          saveTargetAlert={saveTargetAlert}
          removeTargetAlert={removeTargetAlert}
          refreshAlerts={loadTargetAlerts}
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
      </>
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
<br />
{fetchError ? <div style={styles.errorBox}>{fetchError}</div> : null}

{isVolatilityActive ? (
  <div style={styles.volatilityWarning}>
    <strong>{t.volatilityTitle}</strong>
    <br />
    {t.volatilityBody}
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
    merginLeft: 10
    transition:
      "background 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease",
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
    marginBottom: -18,
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
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02)), radial-gradient(circle at top left, rgba(243,217,139,0.16), transparent 44%), rgba(18, 17, 13, 0.48)",
    backdropFilter: "blur(18px) saturate(130%)",
    WebkitBackdropFilter: "blur(18px) saturate(130%)",
    border: "1px solid rgba(243, 217, 139, 0.30)",
    boxShadow:
      "0 18px 45px rgba(0,0,0,0.28), 0 0 24px rgba(214,180,92,0.08), inset 0 1px 0 rgba(255,255,255,0.08)",
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
    background: "rgba(10,10,10,0.78)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    zIndex: 998,
    boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
  },
  bottomTab: {
    border: "1px solid rgba(214,180,92,0.22)",
    background: "rgba(214,180,92,0.05)",
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
    marginTop: 20,
    marginBottom: 10,
  },
  alertCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    border: "1px solid var(--rj-card-border)",
    background: "var(--rj-card-bg)",
    borderRadius: 14,
    padding: 24,
    marginTop: 10,
  },
  removeAlertButton: {
    border: "1px solid rgba(255,120,120,0.35)",
    background: "rgba(120,20,20,0.18)",
    color: "#ffb4b4",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 800,
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
  }

};

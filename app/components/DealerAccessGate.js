"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { gateText } from "../lib/translations";

const SESSION_EXPIRES_KEY = "rj-dealer-session-expires-at";
const SESSION_PROFILE_KEY = "rj-dealer-profile";
const DEVICE_ID_KEY = "rj-dealer-device-id";
const LOGOUT_SUCCESS_KEY = "rj-logout-success";

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 14 && digits.startsWith("0091")) digits = digits.slice(4);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(-10);
  return digits.length === 10 ? digits : "";
}

function getEndOfTodayMs() {
  const end = new Date();
  end.setHours(24, 0, 0, 0);
  return end.getTime();
}

function getOrCreateDeviceId() {
  let deviceId = window.localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

// The server keeps its own copy of the device ID in a cookie. If this browser's
// localStorage was wiped, the server hands back the original ID so we restore it.
function syncDeviceId(serverDeviceId) {
  try {
    if (serverDeviceId && window.localStorage.getItem(DEVICE_ID_KEY) !== serverDeviceId) {
      window.localStorage.setItem(DEVICE_ID_KEY, serverDeviceId);
    }
  } catch {}

  return serverDeviceId || getOrCreateDeviceId();
}

// Ask the browser not to evict this site's storage when the phone is low on
// space. Chrome decides silently; Firefox would show a prompt, so skip it there.
function requestPersistentStorage() {
  try {
    if (/Firefox/i.test(navigator.userAgent)) return;
    navigator.storage?.persist?.();
  } catch {}
}

function saveSession(profile) {
  const expiresAt = getEndOfTodayMs();
  window.localStorage.setItem(SESSION_EXPIRES_KEY, String(expiresAt));
  window.localStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(profile));
}

function clearSession() {
  window.localStorage.removeItem(SESSION_EXPIRES_KEY);
  window.localStorage.removeItem(SESSION_PROFILE_KEY);
}

function readSavedProfile() {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_PROFILE_KEY) || "null");
  } catch {
    return null;
  }
}

async function checkAccess({ phone, deviceId, action = "session_check" }) {
  const res = await fetch("/api/access/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, deviceId, action }),
    cache: "no-store",
  });

  return res.json();
}

export default function DealerAccessGate({
  theme = "dark",
  logoSrc = "/logo.png",
  language = "en",
  onLanguageChange,
  onAccessGranted,
}) {
  const t = gateText[language] || gateText.en;
  const rejectionText = {
    deviceMismatch:
      language === "hi"
        ? "यह मोबाइल नंबर किसी दूसरे डिवाइस से जुड़ा है। डिवाइस रीसेट के लिए कृपया रोनक ज्वेलर्स से संपर्क करें।"
        : "This number is registered to a different device. Please contact Ronak Jewellers to reset your device.",
    deviceBoundElsewhere:
      language === "hi"
        ? "यह डिवाइस किसी दूसरे मोबाइल नंबर से जुड़ा है। कृपया रोनक ज्वेलर्स से संपर्क करें।"
        : "This device is registered with another number. Please contact Ronak Jewellers.",
  };
  function rejectionMessage(access, fallback) {
    if (access.deviceMismatch) return rejectionText.deviceMismatch;
    if (access.deviceBoundElsewhere) return rejectionText.deviceBoundElsewhere;
    return access.message || fallback;
  }
  function changeLanguage(value) {
  if (onLanguageChange) {
    onLanguageChange(value);
  }
}
  const [checking, setChecking] = useState(true);
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logoutSuccess, setLogoutSuccess] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [authorizationOpen, setAuthorizationOpen] = useState(false);
  const [authorizationForm, setAuthorizationForm] = useState({
    name: "",
    firmName: "",
    mobile: "",
    city: "",
    state: "",
    email: "",
  });
  const [authorizationMessage, setAuthorizationMessage] = useState("");
  const [authorizationLoading, setAuthorizationLoading] = useState(false);


  useEffect(() => {
    try {
      if (window.localStorage.getItem(LOGOUT_SUCCESS_KEY) === "1") {
        setLogoutSuccess(true);
        window.localStorage.removeItem(LOGOUT_SUCCESS_KEY);
      }
    } catch {}
  }, []);

  useEffect(() => {
    requestPersistentStorage();

    async function restoreSession() {
      try {
        const deviceId = getOrCreateDeviceId();
        const expiresAt = Number(window.localStorage.getItem(SESSION_EXPIRES_KEY) || 0);
        const savedProfile = readSavedProfile();
        const phone = normalizeIndianMobile(savedProfile?.phone);

        if (!expiresAt || Date.now() >= expiresAt || !phone) {
          clearSession();
          setChecking(false);
          return;
        }

        const access = await checkAccess({ phone, deviceId, action: "session_check" });

        if (!access.allowed) {
          clearSession();
          setMessage(rejectionMessage(access, t.inactive));
          setMobile(phone);
          setChecking(false);
          return;
        }

        const profile = {
          ...savedProfile,
          ...access.profile,
          phone,
          deviceId: syncDeviceId(access.deviceId),
        };

        onAccessGranted(profile, { restored: true });
      } catch (err) {
        console.error(err);
        clearSession();
        setChecking(false);
      }
    }

    restoreSession();
  }, [onAccessGranted, t.inactive]); // eslint-disable-line react-hooks/exhaustive-deps

  async function grantAccess() {
    const phone = normalizeIndianMobile(mobile);
    if (!phone) {
      setMessage(t.validNumber);
      return;
    }

    setSubmitting(true);
    setMessage("");
    setLogoutSuccess(false);

    try {
      const deviceId = getOrCreateDeviceId();
      const access = await checkAccess({ phone, deviceId, action: "login" });

      if (!access.allowed) {
        clearSession();
        setMessage(rejectionMessage(access, t.notAuthorized));
        return;
      }

      const profile = { ...access.profile, phone, deviceId: syncDeviceId(access.deviceId) };

      saveSession(profile);
      onAccessGranted(profile, { restored: false });
    } catch (err) {
      console.error(err);
      setMessage(err?.message || t.unable);
    } finally {
      setSubmitting(false);
    }
  }

  function updateAuthorizationField(field, value) {
    setAuthorizationForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function submitAuthorizationRequest() {
    const payload = {
      name: authorizationForm.name.trim(),
      firmName: authorizationForm.firmName.trim(),
      phone: normalizeIndianMobile(authorizationForm.mobile || mobile),
      city: authorizationForm.city.trim(),
      state: authorizationForm.state.trim(),
      email: authorizationForm.email.trim(),
    };

    if (
      !payload.name ||
      !payload.firmName ||
      !payload.phone ||
      !payload.city ||
      !payload.state
    ) {
      setAuthorizationMessage(t.requestInvalid);
      return;
    }

    setAuthorizationLoading(true);
    setAuthorizationMessage("");

    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || t.requestFailed);
      }

      setAuthorizationForm({
        name: "",
        firmName: "",
        mobile: "",
        city: "",
        state: "",
        email: "",
      });
      setAuthorizationMessage(t.requestSuccess);
    } catch (err) {
      setAuthorizationMessage(err.message || t.requestFailed);
    } finally {
      setAuthorizationLoading(false);
    }
  }

  async function submitFeedback() {
    const text = feedback.trim();
    if (!text) {
      setFeedbackMessage(t.feedbackEmpty);
      return;
    }

    setFeedbackLoading(true);
    setFeedbackMessage("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "",
          name: "Anonymous",
          message: text,
          source: "logout_screen_anonymous",
        }),
      }); 
      const data = await res.json();
      if (!data.success) throw new Error(data.message || t.feedbackFailed);
      setFeedback("");
      setFeedbackMessage(t.feedbackSuccess);
    } catch (err) {
      setFeedbackMessage(err.message || t.feedbackFailed);
    } finally {
      setFeedbackLoading(false);
    }
  }

  if (checking) {
    return (
      <main style={{ ...styles.page, ...(theme === "light" ? styles.lightVars : styles.darkVars) }}>
        <section style={{ ...styles.card, ...styles.checkingCard }}>
          <Image src={logoSrc} alt="Ronak Jewellers" width={190} height={190} style={styles.logo} />
          <h1 style={styles.brand}>{t.brand}</h1>
          <p style={styles.muted}>{t.checking}</p>
        </section>
      </main>
    );
  }

  return (
    <main style={{ ...styles.page, ...(theme === "light" ? styles.lightVars : styles.darkVars) }}>
      <section style={styles.card}>
  <div style={styles.languageRow}>
    <select
      style={styles.languageSelect}
      value={language}
      onChange={(e) => changeLanguage(e.target.value)}
    >
      <option value="en">EN 🇬🇧</option>
      <option value="hi">हि 🇮🇳</option>
    </select>
  </div>
        <Image src={logoSrc} alt="Ronak Jewellers" width={210} height={210} style={styles.logo} />

        {logoutSuccess ? (
          <>
            <h2 style={styles.brand}>{t.brand}</h2>

            <div style={styles.logoutBox}>
              <h2 style={styles.successTitle}>{t.logoutSuccess}</h2>
              <p style={styles.logoutThankYou}>Thank you for visiting Ronak Jewellers.</p>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => {
                  setLogoutSuccess(false);
                  setFeedback("");
                  setFeedbackMessage("");
                  setMessage("");
                }}
              >
                {t.loginAgain}
              </button>
            </div>

            <div style={styles.feedbackBox}>
              <h3 style={styles.feedbackTitle}>Share feedback anonymously</h3>
              <textarea
                style={styles.feedbackTextarea}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={t.feedbackPlaceholder}
                rows={4}
              />
              <button type="button" style={styles.button} onClick={submitFeedback} disabled={feedbackLoading}>
                {feedbackLoading ? "..." : "Submit"}
              </button>
              {feedbackMessage ? <p style={styles.message}>{feedbackMessage}</p> : null}
            </div>

          </>
        ) : (
          <>
            <h2 style={styles.brand}>{t.brand}</h2>
            <h4>{t.dag}</h4>

            <input
              style={styles.input}
              value={mobile}
              inputMode="numeric"
              maxLength={14}
              placeholder={t.placeholder}
              onChange={(e) => setMobile(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") grantAccess();
              }}
            />

            <button type="button" style={styles.button} onClick={grantAccess} disabled={submitting}>
              {submitting ? t.checkingButton : t.continue}
            </button>

            {message ? <p style={styles.message}>{message}</p> : null}
            <p style={styles.note}>{t.accessNote}</p>
            <p style={styles.note}>{t.dnote}</p>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => {
                setAuthorizationOpen((prev) => !prev);
                setAuthorizationMessage("");
                setAuthorizationForm((prev) => ({
                  ...prev,
                  mobile: prev.mobile || mobile,
                }));
              }}
            >
              {t.requestAuthorization}
            </button>

            {authorizationOpen ? (
              <div style={styles.feedbackBox}>
                <label style={styles.label}>{t.requestName}</label>
                <input
                  style={styles.input}
                  value={authorizationForm.name}
                  onChange={(e) => updateAuthorizationField("name", e.target.value)}
                />

                <label style={styles.label}>{t.requestFirmName}</label>
                <input
                  style={styles.input}
                  value={authorizationForm.firmName}
                  onChange={(e) => updateAuthorizationField("firmName", e.target.value)}
                />

                <label style={styles.label}>{t.requestMobile}</label>
                <input
                  style={styles.input}
                  inputMode="numeric"
                  maxLength={14}
                  value={authorizationForm.mobile}
                  onChange={(e) => updateAuthorizationField("mobile", e.target.value)}
                />

                <label style={styles.label}>{t.requestCity}</label>
                <input
                  style={styles.input}
                  value={authorizationForm.city}
                  onChange={(e) => updateAuthorizationField("city", e.target.value)}
                />

                <label style={styles.label}>{t.requestState}</label>
                <input
                  style={styles.input}
                  value={authorizationForm.state}
                  onChange={(e) => updateAuthorizationField("state", e.target.value)}
                />

                <label style={styles.label}>{t.requestEmail}</label>
                <input
                  style={styles.input}
                  type="email"
                  value={authorizationForm.email}
                  onChange={(e) => updateAuthorizationField("email", e.target.value)}
                />

                <button
                  type="button"
                  style={styles.button}
                  onClick={submitAuthorizationRequest}
                  disabled={authorizationLoading}
                >
                  {authorizationLoading ? t.requestSubmitting : t.requestSubmit}
                </button>

                {authorizationMessage ? (
                  <p style={styles.message}>{authorizationMessage}</p>
                ) : null}
              </div>
            ) : null}

          </>
        )}
      </section>
    </main>
  );
}

const styles = {
  darkVars: {
    "--gate-bg": "radial-gradient(circle at top, #2b2414 0%, #0d0d0d 38%, #050505 100%)",
    "--gate-card": "linear-gradient(145deg, rgba(31,31,31,0.96), rgba(10,10,10,0.96))",
    "--gate-border": "rgba(214,180,92,0.32)",
    "--gate-text": "#d6b45c",
    "--gate-brand": "#f3d98b",
    "--gate-muted": "#9f9f9f",
    "--gate-input": "#080808",
  },
  lightVars: {
    "--gate-bg": "radial-gradient(circle at top, #fff7de 0%, #FFEABE 45%, #f2cb7b 100%)",
    "--gate-card": "linear-gradient(145deg, rgba(255,255,255,0.78), rgba(255,234,190,0.94))",
    "--gate-border": "rgba(128,81,0,0.28)",
    "--gate-text": "#5a3600",
    "--gate-brand": "#3f2600",
    "--gate-muted": "#745b31",
    "--gate-input": "#fff8e8",
  },
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "var(--gate-bg)",
    color: "var(--gate-text)",
    fontFamily: "Arial, Helvetica, sans-serif",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxSizing: "border-box",
    textAlign: "center",
    overflowX: "hidden",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    background: "var(--gate-card)",
    border: "1px solid var(--gate-border)",
    borderRadius: 26,
    padding: 24,
    boxShadow: "0 26px 80px rgba(0,0,0,0.30)",
    boxSizing: "border-box",
  },
  checkingCard: { display: "flex", flexDirection: "column", alignItems: "center" },
  logo: { display: "block", margin: "0 auto 14px" },
  brand: { color: "var(--gate-brand)", margin: "4px 0 8px", fontSize: "clamp(23px, 5vw, 37px)" },
  muted: { color: "var(--gate-muted)", lineHeight: 1.55, margin: "0 0 18px" },
  label: { display: "block", textAlign: "left", color: "var(--gate-muted)", fontSize: 13, fontWeight: 400, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 },
  input: { width: "100%", boxSizing: "border-box", background: "var(--gate-input)", color: "var(--gate-brand)", border: "1px solid var(--gate-border)", borderRadius: 14, padding: "15px 14px", fontSize: 17, outline: "none", marginBottom: 12 },
  button: { width: "100%", border: "1px solid var(--gate-border)", background: "linear-gradient(145deg, rgba(214,180,92,0.28), rgba(35,35,35,0.92))", color: "#f3d98b", borderRadius: 14, padding: "15px 20px", fontSize: 17, fontWeight: 800, cursor: "pointer", marginTop: 8 },
  secondaryButton: { width: "100%", border: "1px solid var(--gate-border)", background: "rgba(214,180,92,0.08)", color: "var(--gate-brand)", borderRadius: 14, padding: "13px 18px", fontSize: 15, fontWeight: 800, cursor: "pointer", marginTop: 10 },
  message: { marginTop: 14, color: "var(--gate-brand)", lineHeight: 1.45 },
  note: { marginTop: 16, color: "var(--gate-muted)", fontSize: 13 },
  languageRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, color: "var(--gate-muted)", fontSize: 13 },
  languageSelect: { border: "1px solid var(--gate-border)", background: "var(--gate-input)", color: "var(--gate-brand)", borderRadius: 10, padding: "8px 10px" },
  logoutBox: { border: "1px solid rgba(90,190,130,.35)", background: "rgba(30,120,60,.12)", borderRadius: 16, padding: 12, marginBottom: 14 },
  successTitle: { margin: "0 0 10px", color: "var(--gate-brand)" },
  logoutThankYou: { margin: "0 0 12px", color: "var(--gate-muted)", lineHeight: 1.45, fontSize: 14 },
  feedbackBox: { marginTop: 18, borderTop: "1px solid var(--gate-border)", paddingTop: 16 },
  feedbackTitle: { margin: "0 0 10px", color: "var(--gate-brand)" },
  feedbackTextarea: { width: "100%", boxSizing: "border-box", background: "var(--gate-input)", color: "var(--gate-brand)", border: "1px solid var(--gate-border)", borderRadius: 14, padding: 12, resize: "vertical" },
};

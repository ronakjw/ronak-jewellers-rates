"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const SESSION_EXPIRES_KEY = "rj-dealer-session-expires-at";
const SESSION_PROFILE_KEY = "rj-dealer-profile";
const DEVICE_ID_KEY = "rj-dealer-device-id";
const LOGOUT_SUCCESS_KEY = "rj-logout-success";

const gateText = {
  brand: "Ronak Jewellers",
  checking: "Checking access...",
  placeholder: "Enter 10-digit mobile number",
  continue: "Continue",
  checkingButton: "Checking...",
  sendingOtp: "Sending OTP...",
  enterOtp: "Enter OTP",
  otpPlaceholder: "OTP",
  verify: "Verify & Continue",
  verifying: "Verifying...",
  changeNumber: "Change Number",
  validNumber: "Enter a valid 10-digit mobile number.",
  notAuthorized: "This number is not authorized to view.",
  unable: "Unable to verify access. Please try again.",
  otpSent: "New device detected. OTP sent to your registered number.",
  otpInactive: "OTP service is not active yet. Please contact Ronak Jewellers.",
  otpAgain: "Please request OTP again.",
  enterOtpMsg: "Enter the OTP.",
  differentOtp: "OTP verified for a different number. Please try again.",
  approveFailed: "Unable to approve this device. Please try again.",
  invalidOtp: "Invalid OTP or OTP expired. Please try again.",
  accessNote: "Access for authorized user only.",
  inactive: "Your access is not active. Please contact Ronak Jewellers.",
  newDevice: "This number is being used on a new device. Please verify again.",
  logoutSuccess: "Logout successful.",
  loginAgain: "Login Again",
  feedbackTitle: "Share feedback",
  feedbackPlaceholder: "Type your feedback here...",
  submitFeedback: "Submit Feedback",
  feedbackSuccess: "Thank you. Feedback submitted successfully.",
  feedbackEmpty: "Please enter feedback before submitting.",
  feedbackFailed: "Unable to submit feedback. Please try again.",
};

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

async function checkAccess({ phone, deviceId, firebaseIdToken, action = "session_check" }) {
  const res = await fetch("/api/access/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, deviceId, firebaseIdToken, action }),
    cache: "no-store",
  });

  return res.json();
}

export default function DealerAccessGate({
  theme = "dark",
  logoSrc = "/logo.png",
  onAccessGranted,
}) {
  const t = gateText;
  const [checking, setChecking] = useState(true);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [pendingProfile, setPendingProfile] = useState(null);
  const [pendingPhone, setPendingPhone] = useState("");
  const [logoutSuccess, setLogoutSuccess] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const confirmationResultRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(LOGOUT_SUCCESS_KEY) === "1") {
        setLogoutSuccess(true);
        window.localStorage.removeItem(LOGOUT_SUCCESS_KEY);
      }
    } catch {}
  }, []);

  useEffect(() => {
    auth.useDeviceLanguage();

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

        if (!access.allowed || access.requiresOtp) {
          clearSession();
          setMessage(access.requiresOtp ? t.newDevice : access.message || t.inactive);
          setMobile(phone);
          setChecking(false);
          return;
        }

        const profile = {
          ...savedProfile,
          ...access.profile,
          phone,
          deviceId,
        };

        onAccessGranted(profile, { restored: true });
      } catch (err) {
        console.error(err);
        clearSession();
        setChecking(false);
      }
    }

    restoreSession();
  }, [onAccessGranted, t.inactive, t.newDevice]);

  async function setupRecaptcha() {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;

    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "rj-recaptcha-container", {
      size: "invisible",
    });

    return recaptchaVerifierRef.current;
  }

  async function sendOtp(phone, profile) {
    setSendingOtp(true);
    setMessage("");

    try {
      const verifier = await setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, `+91${phone}`, verifier);
      confirmationResultRef.current = confirmation;
      setPendingPhone(phone);
      setPendingProfile(profile);
      setOtpSent(true);
      setMessage(t.otpSent);
    } catch (err) {
      console.error(err);
      setMessage(err?.code === "auth/billing-not-enabled" ? t.otpInactive : err?.message || "Unable to send OTP. Please try again.");
      try {
        recaptchaVerifierRef.current?.clear?.();
      } catch {}
      recaptchaVerifierRef.current = null;
    } finally {
      setSendingOtp(false);
    }
  }

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
        setMessage(access.message || t.notAuthorized);
        return;
      }

      const profile = { ...access.profile, phone, deviceId };

      if (access.requiresOtp) {
        await sendOtp(phone, profile);
        return;
      }

      saveSession(profile);
      onAccessGranted(profile, { restored: false });
    } catch (err) {
      console.error(err);
      setMessage(err?.message || t.unable);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp() {
    const code = String(otp || "").trim();
    const phone = normalizeIndianMobile(pendingPhone || mobile);

    if (code.length < 4) {
      setMessage(t.enterOtpMsg);
      return;
    }

    if (!confirmationResultRef.current || !phone) {
      setMessage(t.otpAgain);
      return;
    }

    setVerifyingOtp(true);
    setMessage("");

    try {
      const result = await confirmationResultRef.current.confirm(code);
      const verifiedPhone = normalizeIndianMobile(result.user.phoneNumber);

      if (verifiedPhone !== phone) {
        await signOut(auth);
        setMessage(t.differentOtp);
        return;
      }

      const firebaseIdToken = await result.user.getIdToken();
      const deviceId = getOrCreateDeviceId();
      const access = await checkAccess({ phone, deviceId, firebaseIdToken, action: "otp_verify" });

      if (!access.allowed || access.requiresOtp) {
        await signOut(auth);
        setMessage(t.approveFailed);
        return;
      }

      const profile = { ...(pendingProfile || {}), ...access.profile, phone, deviceId };
      saveSession(profile);
      onAccessGranted(profile, { restored: false });
    } catch (err) {
      console.error(err);
      setMessage(t.invalidOtp);
    } finally {
      setVerifyingOtp(false);
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
      const phone = normalizeIndianMobile(mobile || pendingPhone || readSavedProfile()?.phone);
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name: readSavedProfile()?.name || "",
          message: text,
          source: "logout_screen",
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

        <Image src={logoSrc} alt="Ronak Jewellers" width={210} height={210} style={styles.logo} />

        {logoutSuccess ? (
          <div style={styles.logoutBox}>
            <h2 style={styles.successTitle}>{t.logoutSuccess}</h2>
            <button type="button" style={styles.secondaryButton} onClick={() => setLogoutSuccess(false)}>
              {t.loginAgain}
            </button>
          </div>
        ) : null}

        <h2 style={styles.brand}>{t.brand}</h2>
          <h4> DEALER ACCESS </h4>
      

        {!otpSent ? (
          <>
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

            <button type="button" style={styles.button} onClick={grantAccess} disabled={submitting || sendingOtp}>
              {sendingOtp ? t.sendingOtp : submitting ? t.checkingButton : t.continue}
            </button>
          </>
        ) : (
          <>
            <label style={styles.label}>{t.enterOtp}</label>
            <input
              style={styles.input}
              value={otp}
              inputMode="numeric"
              maxLength={8}
              placeholder={t.otpPlaceholder}
              onChange={(e) => setOtp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") verifyOtp();
              }}
            />

            <button type="button" style={styles.button} onClick={verifyOtp} disabled={verifyingOtp}>
              {verifyingOtp ? t.verifying : t.verify}
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={async () => {
                setOtpSent(false);
                setOtp("");
                setMessage("");
                setPendingPhone("");
                setPendingProfile(null);
                try {
                  await signOut(auth);
                } catch {}
              }}
            >
              {t.changeNumber}
            </button>
          </>
        )}

        {message ? <p style={styles.message}>{message}</p> : null}
        <p style={styles.note}>{t.accessNote}</p>
          <p style={styles.note}> NOTE: To avoid OTP verification, enter your mobile number through your registered device only.</p>

        {logoutSuccess ? (
          <div style={styles.feedbackBox}>
            <h3 style={styles.feedbackTitle}>{t.feedbackTitle}</h3>
            <textarea
              style={styles.feedbackTextarea}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t.feedbackPlaceholder}
              rows={4}
            />
            <button type="button" style={styles.button} onClick={submitFeedback} disabled={feedbackLoading}>
              {feedbackLoading ? "..." : t.submitFeedback}
            </button>
            {feedbackMessage ? <p style={styles.message}>{feedbackMessage}</p> : null}
          </div>
        ) : null}

        <div id="rj-recaptcha-container" />
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
  label: { display: "block", textAlign: "left", color: "var(--gate-muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 },
  input: { width: "100%", boxSizing: "border-box", background: "var(--gate-input)", color: "var(--gate-brand)", border: "1px solid var(--gate-border)", borderRadius: 14, padding: "15px 14px", fontSize: 17, outline: "none", marginBottom: 12 },
  button: { width: "100%", border: "1px solid var(--gate-border)", background: "linear-gradient(145deg, rgba(214,180,92,0.28), rgba(35,35,35,0.92))", color: "#f3d98b", borderRadius: 14, padding: "15px 20px", fontSize: 17, fontWeight: 800, cursor: "pointer", marginTop: 8 },
  secondaryButton: { width: "100%", border: "1px solid var(--gate-border)", background: "rgba(214,180,92,0.08)", color: "var(--gate-brand)", borderRadius: 14, padding: "13px 18px", fontSize: 15, fontWeight: 800, cursor: "pointer", marginTop: 10 },
  message: { marginTop: 14, color: "var(--gate-brand)", lineHeight: 1.45 },
  note: { marginTop: 16, color: "var(--gate-muted)", fontSize: 13 },
  languageRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, color: "var(--gate-muted)", fontSize: 13 },
  languageSelect: { border: "1px solid var(--gate-border)", background: "var(--gate-input)", color: "var(--gate-brand)", borderRadius: 10, padding: "8px 10px" },
  logoutBox: { border: "1px solid rgba(90,190,130,.35)", background: "rgba(30,120,60,.12)", borderRadius: 16, padding: 12, marginBottom: 14 },
  successTitle: { margin: "0 0 10px", color: "var(--gate-brand)" },
  feedbackBox: { marginTop: 18, borderTop: "1px solid var(--gate-border)", paddingTop: 16 },
  feedbackTitle: { margin: "0 0 10px", color: "var(--gate-brand)" },
  feedbackTextarea: { width: "100%", boxSizing: "border-box", background: "var(--gate-input)", color: "var(--gate-brand)", border: "1px solid var(--gate-border)", borderRadius: 14, padding: 12, resize: "vertical" },
};

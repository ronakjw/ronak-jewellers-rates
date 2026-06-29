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

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 14 && digits.startsWith("0091")) {
    digits = digits.slice(4);
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

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
    if (window.crypto?.randomUUID) {
      deviceId = window.crypto.randomUUID();
    } else {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }

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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone, deviceId, firebaseIdToken, action }),
    cache: "no-store",
  });

  return res.json();
}

async function logLogin(payload) {
  try {
    await fetch("/api/access/login-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (err) {
    console.error("Login log failed", err);
  }
}

export default function DealerAccessGate({
  theme = "dark",
  logoSrc = "/logo.png",
  onAccessGranted,
}) {
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

  const confirmationResultRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  useEffect(() => {
    auth.useDeviceLanguage();

    async function restoreSession() {
      try {
        const deviceId = getOrCreateDeviceId();
        const expiresAt = Number(
          window.localStorage.getItem(SESSION_EXPIRES_KEY) || 0
        );
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
          setMessage(
            access.requiresOtp
              ? "This number is being used on a new device. Please verify again."
              : "Your access is not active."
          );
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
  }, [onAccessGranted]);

  async function setupRecaptcha() {
    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    recaptchaVerifierRef.current = new RecaptchaVerifier(
      auth,
      "rj-recaptcha-container",
      {
        size: "invisible",
      }
    );

    return recaptchaVerifierRef.current;
  }

  async function sendOtp(phone, profile) {
    setSendingOtp(true);
    setMessage("");

    try {
      const verifier = await setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(
        auth,
        `+91${phone}`,
        verifier
      );

      confirmationResultRef.current = confirmation;
      setPendingPhone(phone);
      setPendingProfile(profile);
      setOtpSent(true);
      setMessage("New device detected. OTP sent to your registered number.");
    } catch (err) {
      console.error(err);

      if (err?.code === "auth/billing-not-enabled") {
        setMessage(
          "OTP service is not active yet. Please contact Ronak Jewellers."
        );
      } else {
        setMessage(err?.message || "Unable to send OTP. Please try again.");
      }

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
      setMessage("Enter a valid 10-digit mobile number.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const deviceId = getOrCreateDeviceId();
      const access = await checkAccess({ phone, deviceId, action: "login" });

      if (!access.allowed) {
        clearSession();
        setMessage(
          access.message ||
            "Unauthorized number! Please contact us for authorization."
        );
        return;
      }

      const profile = {
        ...access.profile,
        phone,
        deviceId,
      };

      if (access.requiresOtp) {
        await sendOtp(phone, profile);
        return;
      }

      saveSession(profile);
      onAccessGranted(profile, { restored: false });
    } catch (err) {
      console.error(err);
      setMessage(err?.message || "Unable to verify access. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp() {
    const code = String(otp || "").trim();
    const phone = normalizeIndianMobile(pendingPhone || mobile);

    if (code.length < 4) {
      setMessage("Enter the OTP.");
      return;
    }

    if (!confirmationResultRef.current || !phone) {
      setMessage("Please request OTP again.");
      return;
    }

    setVerifyingOtp(true);
    setMessage("");

    try {
      const result = await confirmationResultRef.current.confirm(code);
      const verifiedPhone = normalizeIndianMobile(result.user.phoneNumber);

      if (verifiedPhone !== phone) {
        await signOut(auth);
        setMessage("OTP verified for a different number. Please try again.");
        return;
      }

      const firebaseIdToken = await result.user.getIdToken();
      const deviceId = getOrCreateDeviceId();
      const access = await checkAccess({
        phone,
        deviceId,
        firebaseIdToken,
        action: "otp_verify",
      });

      if (!access.allowed || access.requiresOtp) {
        await signOut(auth);
        setMessage("Unable to approve this device. Please try again.");
        return;
      }

      const profile = {
        ...(pendingProfile || {}),
        ...access.profile,
        phone,
        deviceId,
      };

      saveSession(profile);

      onAccessGranted(profile, { restored: false });
    } catch (err) {
      console.error(err);
      setMessage("Invalid OTP or OTP expired. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  }

  if (checking) {
    return (
      <main
        style={{
          ...styles.page,
          ...(theme === "light" ? styles.lightVars : styles.darkVars),
        }}
      >
        <section style={{ ...styles.card, ...styles.checkingCard }}>

  <Image src={logoSrc}  alt="Ronak Jewellers"   width={200}  height={200}  style={styles.logoImage} />
   
          <h1 style={styles.brand}>Ronak Jewellers</h1>
          <p style={styles.muted}>Checking access...</p>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        ...styles.page,
        ...(theme === "light" ? styles.lightVars : styles.darkVars),
      }}
    >
      <section style={styles.card}>
        <Image
          src={logoSrc}
          alt="Ronak Jewellers"
          width={210}
          height={210}
          style={styles.logo}
        />
        <h1 style={styles.brand}>Ronak Jewellers</h1>
        <p style={styles.label}>
          DEALER ACCESS LOGIN
        </p>

        {!otpSent ? (
          <>
            <input
              style={styles.input}
              value={mobile}
              inputMode="numeric"
              maxLength={14}
              placeholder="Enter your 10-digit Mobile Number"
              onChange={(e) => setMobile(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  grantAccess();
                }
              }}
            />

            <button
              type="button"
              style={styles.button}
              onClick={grantAccess}
              disabled={submitting || sendingOtp}
            >
              {sendingOtp
                ? "Sending OTP..."
                : submitting
                ? "Checking..."
                : "Continue"}
            </button>
          </>
        ) : (
          <>
            <label style={styles.label}>Enter OTP</label>
            <input
              style={styles.input}
              value={otp}
              inputMode="numeric"
              maxLength={8}
              placeholder="OTP"
              onChange={(e) => setOtp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  verifyOtp();
                }
              }}
            />

            <button
              type="button"
              style={styles.button}
              onClick={verifyOtp}
              disabled={verifyingOtp}
            >
              {verifyingOtp ? "Verifying..." : "Verify & Continue"}
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
              Change Number
            </button>
          </>
        )}

        {message ? <p style={styles.message}>{message}</p> : null}
        <p style={styles.note}>Access for authorized users only.</p>
        <div id="rj-recaptcha-container" />
      </section>
    </main>
  );
}

const styles = {
  darkVars: {
    "--gate-bg":
      "radial-gradient(circle at top, #2b2414 0%, #0d0d0d 38%, #050505 100%)",
    "--gate-card":
      "linear-gradient(145deg, rgba(31,31,31,0.96), rgba(10,10,10,0.96))",
    "--gate-border": "rgba(214,180,92,0.32)",
    "--gate-text": "#d6b45c",
    "--gate-brand": "#f3d98b",
    "--gate-muted": "#9f9f9f",
    "--gate-input": "#080808",
  },
  lightVars: {
    "--gate-bg":
      "radial-gradient(circle at top, #fff7de 0%, #FFEABE 45%, #f2cb7b 100%)",
    "--gate-card":
      "linear-gradient(145deg, rgba(255,255,255,0.78), rgba(255,234,190,0.94))",
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
  checkingCard: {
    maxWidth: 390,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  logo: {
    width: "min(210px, 58vw)",
    height: "auto",
    margin: "0 auto 12px",
    display: "block",
  },
  brand: {
    margin: 0,
    color: "var(--gate-brand)",
    fontSize: "clamp(30px, 7vw, 46px)",
  },
  
  label: {
    display: "block",
    color: "var(--gate-muted)",
    margin: "20px 0 8px",
    fontWeight: 700,
    marginBottom: "15px",
  },
  input: {
    width: "100%",
    padding: "15px 16px",
    borderRadius: 6,
    border: "1px solid var(--gate-border)",
    background: "var(--gate-input)",
    color: "var(--gate-text)",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    marginTop: 16,
    padding: "15px 18px",
    border: 0,
    borderRadius: 18,
    background: "linear-gradient(145deg, #f3d98b, #a87b24)",
    color: "#111",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    width: "100%",
    marginTop: 10,
    border: "1px solid var(--gate-border)",
    background: "transparent",
    color: "var(--gate-brand)",
    borderRadius: 14,
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  message: {
    marginTop: 14,
    color: "#ffce6a",
    lineHeight: 1.5,
  },
  note: {
    marginTop: 18,
    color: "var(--gate-muted)",
    fontSize: 13,
  },
};

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
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

const SESSION_KEY = "rj-dealer-session-expires-at";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  return digits.length === 10 ? digits : "";
}

async function checkAccess(phone) {
  const res = await fetch("/api/access/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone }),
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

export default function DealerAccessGate({ theme = "dark", logoSrc = "/logo.png", onAccessGranted }) {
  const [checking, setChecking] = useState(true);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authorizedProfile, setAuthorizedProfile] = useState(null);
  const confirmationResultRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  useEffect(() => {
    auth.useDeviceLanguage();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user?.phoneNumber) {
          setChecking(false);
          return;
        }

        const expiresAt = Number(window.localStorage.getItem(SESSION_KEY) || 0);

        if (!expiresAt || Date.now() >= expiresAt) {
          window.localStorage.removeItem(SESSION_KEY);
          await signOut(auth);
          setChecking(false);
          return;
        }

        const phone = normalizeIndianMobile(user.phoneNumber);
        const access = await checkAccess(phone);

        if (!access.allowed) {
          window.localStorage.removeItem(SESSION_KEY);
          await signOut(auth);
          setMessage("Your access is not active. Please contact Ronak Jewellers.");
          setChecking(false);
          return;
        }

        onAccessGranted({
          ...access.profile,
          phone,
        });
      } catch (err) {
        console.error(err);
        setChecking(false);
      }
    });

    return () => unsubscribe();
  }, []);

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

  async function sendOtp() {
    const phone = normalizeIndianMobile(mobile);

    if (!phone) {
      setMessage("Enter a valid 10-digit mobile number.");
      return;
    }

    setSending(true);
    setMessage("");

    try {
      const access = await checkAccess(phone);

      if (!access.allowed) {
        setMessage("This number is not authorized to view live rates.");
        return;
      }

      setAuthorizedProfile({
        ...access.profile,
        phone,
      });

      const verifier = await setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, `+91${phone}`, verifier);

      confirmationResultRef.current = confirmation;
      setOtpSent(true);
      setMessage("OTP sent successfully.");
    } catch (err) {
      console.error(err);
      setMessage(err?.message || "Unable to send OTP. Please try again.");

      try {
        recaptchaVerifierRef.current?.clear?.();
      } catch {}

      recaptchaVerifierRef.current = null;
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp() {
    const code = String(otp || "").trim();

    if (code.length < 4) {
      setMessage("Enter the OTP.");
      return;
    }

    if (!confirmationResultRef.current) {
      setMessage("Please request OTP again.");
      return;
    }

    setVerifying(true);
    setMessage("");

    try {
      const result = await confirmationResultRef.current.confirm(code);
      const phone = normalizeIndianMobile(result.user.phoneNumber);
      const access = await checkAccess(phone);

      if (!access.allowed) {
        await signOut(auth);
        setMessage("Your access is not active. Please contact Ronak Jewellers.");
        return;
      }

      const expiresAt = Date.now() + SESSION_DURATION_MS;
      window.localStorage.setItem(SESSION_KEY, String(expiresAt));

      const profile = {
        ...(authorizedProfile || access.profile),
        ...access.profile,
        phone,
      };

      await logLogin({
        phone,
        uid: result.user.uid,
      });

      onAccessGranted(profile);
    } catch (err) {
      console.error(err);
      setMessage("Invalid OTP or OTP expired. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  if (checking) {
    return (
      <main style={{ ...styles.page, ...(theme === "light" ? styles.lightVars : styles.darkVars) }}>
        <Image src={logoSrc} alt="Ronak Jewellers" width={230} height={230} style={styles.logo} />
        <h1 style={styles.brand}>Ronak Jewellers</h1>
        <p style={styles.muted}>Checking access...</p>
      </main>
    );
  }

  return (
    <main style={{ ...styles.page, ...(theme === "light" ? styles.lightVars : styles.darkVars) }}>
      <section style={styles.card}>
        <Image src={logoSrc} alt="Ronak Jewellers" width={210} height={210} style={styles.logo} />
        <h1 style={styles.brand}>Dealer Access</h1>
        <p style={styles.muted}>Enter your authorized mobile number to view live bullion rates.</p>

        {!otpSent ? (
          <>
            <label style={styles.label}>Mobile Number</label>
            <input
              style={styles.input}
              value={mobile}
              inputMode="numeric"
              maxLength={13}
              placeholder="10-digit mobile number"
              onChange={(e) => setMobile(e.target.value)}
            />
            <button type="button" style={styles.button} onClick={sendOtp} disabled={sending}>
              {sending ? "Sending OTP..." : "Send OTP"}
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
            />
            <button type="button" style={styles.button} onClick={verifyOtp} disabled={verifying}>
              {verifying ? "Verifying..." : "Verify & Continue"}
            </button>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setMessage("");
              }}
            >
              Change Number
            </button>
          </>
        )}

        {message ? <p style={styles.message}>{message}</p> : null}
        <p style={styles.note}>Access stays active for 24 hours on this device.</p>
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
    background: "var(--gate-bg)",
    color: "var(--gate-text)",
    fontFamily: "Arial, Helvetica, sans-serif",
    padding: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    textAlign: "center",
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
  logo: {
    margin: "0 auto 12px",
  },
  brand: {
    margin: 0,
    color: "var(--gate-brand)",
    fontSize: "clamp(30px, 7vw, 46px)",
  },
  muted: {
    color: "var(--gate-muted)",
    lineHeight: 1.6,
  },
  label: {
    display: "block",
    color: "var(--gate-muted)",
    textAlign: "left",
    marginTop: 18,
    marginBottom: 8,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "var(--gate-input)",
    color: "var(--gate-brand)",
    border: "1px solid var(--gate-border)",
    borderRadius: 14,
    padding: "15px 14px",
    fontSize: 18,
    outline: "none",
  },
  button: {
    width: "100%",
    marginTop: 18,
    border: "1px solid rgba(214,180,92,0.55)",
    background: "linear-gradient(145deg, rgba(214,180,92,0.32), rgba(35,35,35,0.92))",
    color: "#f3d98b",
    borderRadius: 14,
    padding: "15px 20px",
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
    color: "var(--gate-brand)",
    marginTop: 15,
    lineHeight: 1.5,
  },
  note: {
    color: "var(--gate-muted)",
    fontSize: 12,
    marginTop: 18,
  },
};

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SESSION_EXPIRES_KEY = "rj-dealer-session-expires-at";
const SESSION_PROFILE_KEY = "rj-dealer-profile";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

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

function saveSession(profile) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
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

export default function DealerAccessGate({
  theme = "dark",
  logoSrc = "/logo.png",
  onAccessGranted,
}) {
  const [checking, setChecking] = useState(true);
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      try {
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

        const access = await checkAccess(phone);

        if (!access.allowed) {
          clearSession();
          setMessage("Your access is not active. Please contact Ronak Jewellers.");
          setChecking(false);
          return;
        }

        const profile = {
          ...savedProfile,
          ...access.profile,
          phone,
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

  async function grantAccess() {
    const phone = normalizeIndianMobile(mobile);

    if (!phone) {
      setMessage("Enter a valid 10-digit mobile number.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const access = await checkAccess(phone);

      if (!access.allowed) {
        clearSession();
        setMessage("This number is not authorized to view live rates.");
        return;
      }

      const profile = {
        ...access.profile,
        phone,
      };

      saveSession(profile);
      await logLogin({ phone });
      onAccessGranted(profile, { restored: false });
    } catch (err) {
      console.error(err);
      setMessage(err?.message || "Unable to verify access. Please try again.");
    } finally {
      setSubmitting(false);
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
        <Image
          src={logoSrc}
          alt="Ronak Jewellers"
          width={230}
          height={230}
          style={styles.logo}
        />
        <h1 style={styles.brand}>Ronak Jewellers</h1>
        <p style={styles.muted}>Checking access...</p>
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
        <h1 style={styles.brand}>Dealer Access</h1>
        <p style={styles.muted}>
          Enter your registered mobile number to view live bullion rates.
        </p>

        <label style={styles.label}>Mobile Number</label>
        <input
          style={styles.input}
          value={mobile}
          inputMode="numeric"
          maxLength={14}
          placeholder="10-digit mobile number"
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
          disabled={submitting}
        >
          {submitting ? "Checking..." : "Continue"}
        </button>

        {message ? <p style={styles.message}>{message}</p> : null}
        <p style={styles.note}>Access stays active for 24 hours on this device.</p>
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
    margin: "20px 0 8px",
    fontWeight: 700,
  },
  input: {
    width: "100%",
    padding: "15px 16px",
    borderRadius: 16,
    border: "1px solid var(--gate-border)",
    background: "var(--gate-input)",
    color: "var(--gate-text)",
    fontSize: 18,
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


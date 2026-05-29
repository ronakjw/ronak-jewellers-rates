"use client";

import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import Image from "next/image";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

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

const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = "rrmctexim@gmail.com";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      doc(db, "settings", "bullion"),
      (snapshot) => {
        setSettings(snapshot.data());
      }
    );

    return () => unsub();
  }, [user]);

  async function login(e) {
    e.preventDefault();
    setMessage("");

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (result.user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        setMessage("This email is not allowed.");
        return;
      }

      setMessage("Login successful.");
    } catch (err) {
      setMessage("Login failed. Check email/password.");
    }
  }

  async function saveSettings(e) {
    e.preventDefault();

    if (!settings) return;

    setSaving(true);
    setMessage("");

    try {
      await updateDoc(doc(db, "settings", "bullion"), {
        buyingPremium: Number(settings.buyingPremium || 0),
        sellingPremium: Number(settings.sellingPremium || 0),
        showRates: Boolean(settings.showRates),
        autoContract: Boolean(settings.autoContract),
        manualContract: String(settings.manualContract || ""),
        marketStartHour: Number(settings.marketStartHour || 12),
        marketEndHour: Number(settings.marketEndHour || 21),
        refreshBefore530: Number(settings.refreshBefore530 || 7),
        refreshAfter530: Number(settings.refreshAfter530 || 2),
      });

      setMessage("Settings saved successfully.");
    } catch (err) {
      setMessage("Save failed. Check Firestore rules.");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field, value) {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  if (!user) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <Image   src="/logoo.png"   alt="Ronak Jewellers"   width={100}   height={115}   style={{     marginBottom: 20,   }} />

          <h1 style={styles.title}>Ronak Jewellers</h1>
          <p style={styles.subtitle}>Admin Login</p>

          <form onSubmit={login} style={styles.form}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            /><br/>

            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Enter admin password"
            />

            <button style={styles.primaryButton} type="submit">
              Login
            </button>
          </form>

          {message ? <p style={styles.message}>{message}</p> : null}
        </section>
      </main>
    );
  }

  if (!settings) {
    return (
      <main style={styles.pageCenter}>
        <Image   src="/logoo.png"   alt="Ronak Jewellers"   width={100}   height={115}   style={{     marginBottom: 20,   }} />
        <h1 style={styles.title}>Loading admin...</h1>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.adminShell}>
        <div style={styles.headerRow}>
          <div>
            <Image
                src="/logo.png"
                alt="Ronak Jewellers"
                width={50} height={50} />
            <h1 style={styles.title}>Admin Panel</h1>
            <p style={styles.subtitle}>Ronak Jewellers Live Rates</p>
          </div>

          <button
            style={styles.logoutButton}
            onClick={() => signOut(auth)}
          >
            Logout
          </button>
        </div>

        <form onSubmit={saveSettings} style={styles.grid}>
          <div style={styles.controlCard}>
            <label style={styles.label}>Buying Premium</label>
            <input
              style={styles.input}
              type="number"
              value={settings.buyingPremium}
              onChange={(e) =>
                updateField("buyingPremium", e.target.value)
              }
            />
          </div>

          <div style={styles.controlCard}>
            <label style={styles.label}>Selling Premium</label>
            <input
              style={styles.input}
              type="number"
              value={settings.sellingPremium}
              onChange={(e) =>
                updateField("sellingPremium", e.target.value)
              }
            />
          </div>

          <div style={styles.controlCard}>
            <label style={styles.label}>Show Rates</label>
            <select
              style={styles.input}
              value={settings.showRates ? "yes" : "no"}
              onChange={(e) =>
                updateField("showRates", e.target.value === "yes")
              }
            >
              <option value="yes">Show</option>
              <option value="no">Hide</option>
            </select>
          </div>

          <div style={styles.controlCard}>
            <label style={styles.label}>Contract Mode</label>
            <select
              style={styles.input}
              value={settings.autoContract ? "auto" : "manual"}
              onChange={(e) =>
                updateField("autoContract", e.target.value === "auto")
              }
            >
              <option value="auto">Auto Active Contract</option>
              <option value="manual">Manual Contract</option>
            </select>
          </div>

          <div style={styles.controlCard}>
            <label style={styles.label}>Manual Contract</label>
            <input
              style={styles.input}
              value={settings.manualContract || ""}
              onChange={(e) =>
                updateField("manualContract", e.target.value)
              }
              placeholder="SILVER26JULFUT"
            />
          </div>

          <div style={styles.controlCard}>
            <label style={styles.label}>Market Start Hour</label>
            <input
              style={styles.input}
              type="number"
              value={settings.marketStartHour}
              onChange={(e) =>
                updateField("marketStartHour", e.target.value)
              }
            />
          </div>

          <div style={styles.controlCard}>
            <label style={styles.label}>Market End Hour</label>
            <input
              style={styles.input}
              type="number"
              value={settings.marketEndHour}
              onChange={(e) =>
                updateField("marketEndHour", e.target.value)
              }
            />
          </div>

          <div style={styles.controlCard}>
            <label style={styles.label}>
              Refresh Before 5:30 PM / sec
            </label>
            <input
              style={styles.input}
              type="number"
              value={settings.refreshBefore530}
              onChange={(e) =>
                updateField("refreshBefore530", e.target.value)
              }
            />
          </div>

          <div style={styles.controlCard}>
            <label style={styles.label}>
              Refresh After 5:30 PM / sec
            </label>
            <input
              style={styles.input}
              type="number"
              value={settings.refreshAfter530}
              onChange={(e) =>
                updateField("refreshAfter530", e.target.value)
              }
            />
          </div>

          <button
            style={styles.primaryButtonWide}
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>

        {message ? <p style={styles.message}>{message}</p> : null}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #2b2414 0%, #0d0d0d 38%, #050505 100%)",
    color: "#d6b45c",
    fontFamily: "Arial, Helvetica, sans-serif",
    padding: "24px 16px",
    boxSizing: "border-box",
  },

  pageCenter: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #2b2414 0%, #0d0d0d 38%, #050505 100%)",
    color: "#d6b45c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  card: {
    width: "100%",
    maxWidth: 430,
    margin: "80px auto",
    background:
      "linear-gradient(145deg, rgba(31,31,31,0.96), rgba(10,10,10,0.96))",
    border: "1px solid rgba(214,180,92,0.32)",
    borderRadius: 26,
    padding: 24,
    boxShadow: "0 26px 80px rgba(0,0,0,0.55)",
    boxSizing: "border-box",
  },

  adminShell: {
    width: "100%",
    maxWidth: 980,
    margin: "0 auto",
    background:
      "linear-gradient(145deg, rgba(31,31,31,0.96), rgba(10,10,10,0.96))",
    border: "1px solid rgba(214,180,92,0.32)",
    borderRadius: 26,
    padding: 24,
    boxShadow: "0 26px 80px rgba(0,0,0,0.55)",
    boxSizing: "border-box",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 24,
  },

  title: {
    margin: 0,
    color: "#f3d98b",
    fontSize: "clamp(30px, 6vw, 44px)",
    letterSpacing: "0.03em",
  },

  subtitle: {
    marginTop: 8,
    color: "#9f9f9f",
  },

  form: {
    marginTop: 24,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },

  controlCard: {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
  },

  label: {
    display: "block",
    color: "#c6c6c6",
    fontSize: 13,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 9,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#080808",
    color: "#f3d98b",
    border: "1px solid rgba(214,180,92,0.38)",
    borderRadius: 12,
    padding: "14px 13px",
    fontSize: 16,
    outline: "none",
  },

  primaryButton: {
    width: "100%",
    marginTop: 18,
    border: "1px solid rgba(214,180,92,0.55)",
    background:
      "linear-gradient(145deg, rgba(214,180,92,0.28), rgba(35,35,35,0.92))",
    color: "#f3d98b",
    borderRadius: 14,
    padding: "15px 20px",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
  },

  primaryButtonWide: {
    gridColumn: "1 / -1",
    border: "1px solid rgba(214,180,92,0.55)",
    background:
      "linear-gradient(145deg, rgba(214,180,92,0.28), rgba(35,35,35,0.92))",
    color: "#f3d98b",
    borderRadius: 16,
    padding: "16px 22px",
    fontSize: 18,
    fontWeight: 800,
    cursor: "pointer",
  },

  logoutButton: {
    border: "1px solid rgba(214,180,92,0.35)",
    background: "rgba(214,180,92,0.08)",
    color: "#f3d98b",
    borderRadius: 12,
    padding: "10px 14px",
    cursor: "pointer",
  },

  message: {
    marginTop: 18,
    color: "#f3d98b",
    textAlign: "center",
  },
};

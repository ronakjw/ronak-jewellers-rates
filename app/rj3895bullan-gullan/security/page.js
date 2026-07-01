"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
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
const ADMIN_EMAIL = "rrmctexim@gmail.com";

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value?._seconds ? new Date(value._seconds * 1000) : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN");
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

function rateLabel(type) {
  return {
    silver_mcx_buy: "Silver MCX Buy",
    silver_mcx_sell: "Silver MCX Sell",
    gold_mcx_buy: "Gold MCX Buy",
    gold_mcx_sell: "Gold MCX Sell",
  }[type] || type;
}

function conditionLabel(condition) {
  return condition === "below_equal" ? "≤" : "≥";
}

async function apiFetch(path, token, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
  return res.json();
}

export default function SecurityAdminPage() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [targetAlerts, setTargetAlerts] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
  }, []);

  const filteredDevices = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return devices;
    return devices.filter((item) => `${item.name} ${item.phone} ${item.registeredDevice}`.toLowerCase().includes(term));
  }, [devices, search]);

  async function getToken() {
    if (!auth.currentUser) throw new Error("Admin login required");
    return auth.currentUser.getIdToken();
  }

  async function loadAll() {
    if (!auth.currentUser) return;
    setLoading(true);
    setMessage("");
    try {
      const token = await getToken();
      const [deviceData, alertData, feedbackData, notificationData] = await Promise.all([
        apiFetch("/api/device-manager", token),
        apiFetch("/api/target-alerts/admin", token),
        apiFetch("/api/feedback/admin", token),
        apiFetch("/api/notifications/settings", token),
      ]);

      if (deviceData.success) setDevices(deviceData.devices || []);
      if (alertData.success) setTargetAlerts(alertData.alerts || []);
      if (feedbackData.success) setFeedback(feedbackData.feedback || []);
      if (notificationData.success) setNotificationSettings(notificationData.settings || {});
    } catch (err) {
      setMessage(err.message || "Unable to load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) loadAll();
  }, [user]);

  async function login(e) {
    e.preventDefault();
    setMessage("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        setMessage("This email is not allowed.");
        return;
      }
      setMessage("Login successful.");
    } catch {
      setMessage("Login failed. Check email/password.");
    }
  }

  async function deviceAction(phone, action) {
    setMessage("");
    try {
      const token = await getToken();
      const data = await apiFetch("/api/device-manager", token, {
        method: "POST",
        body: JSON.stringify({ phone, action }),
      });
      setMessage(data.message || (data.success ? "Updated" : "Action failed"));
      await loadAll();
    } catch (err) {
      setMessage(err.message || "Device action failed");
    }
  }

  async function removeTargetAlert(id) {
    setMessage("");
    try {
      const token = await getToken();
      const data = await apiFetch(`/api/target-alerts/admin?id=${encodeURIComponent(id)}`, token, {
        method: "DELETE",
      });
      setMessage(data.success ? "Target alert removed." : data.message || "Unable to remove alert");
      await loadAll();
    } catch (err) {
      setMessage(err.message || "Unable to remove alert");
    }
  }

  async function saveNotifications() {
    setMessage("");
    try {
      const token = await getToken();
      const data = await apiFetch("/api/notifications/settings", token, {
        method: "POST",
        body: JSON.stringify(notificationSettings || {}),
      });
      setMessage(data.success ? "Notification settings saved." : data.message || "Save failed");
      if (data.settings) setNotificationSettings(data.settings);
    } catch (err) {
      setMessage(err.message || "Notification settings save failed");
    }
  }

  if (!user) {
    return (
      <main style={styles.page}>
        <section style={styles.loginCard}>
          <Image src="/logo.png" alt="Ronak Jewellers" width={170} height={170} />
          <h1 style={styles.title}>RJ Security Admin</h1>
          <form onSubmit={login} style={styles.form}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button style={styles.primaryButton}>Login</button>
          </form>
          {message ? <p style={styles.message}>{message}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Security & User Tools</h1>
            <p style={styles.subtitle}>Device Manager, Notifications, Target Alerts and Feedback</p>
          </div>
          <div style={styles.headerActions}>
            <a href="/rj3895bullan-gullan" style={styles.smallButton}>Main Admin</a>
            <button style={styles.smallButton} onClick={loadAll} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
            <button style={styles.smallButton} onClick={() => signOut(auth)}>Logout</button>
          </div>
        </div>

        {message ? <div style={styles.messageBox}>{message}</div> : null}

        <section style={styles.card}>
          <h2>Device Manager</h2>
          <input style={styles.input} placeholder="Search name or mobile number" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div style={styles.tableWrap}>
            {filteredDevices.map((item) => (
              <div key={item.phone} style={styles.deviceCard}>
                <div>
                  <strong style={styles.mini}>{item.name || "--"}</strong>
                </div>
                <div>
                  <span style={styles.labelSmall}>Device</span>
                  <p style={styles.mini}>{item.registeredDevice || "--"}</p>
                </div>
                <div>
                  <span style={styles.labelSmall}>Last Login</span>
                  <p style={styles.mini}>{formatDate(item.lastLoginTime)}</p>
                  <p style={styles.mini}>{item.lastCity || item.lastIp || "--"}</p>
                </div>
                <div style={styles.actions}>
                  <button style={styles.smallButton} onClick={() => deviceAction(item.phone, "remove_device")}>Remove</button>
                  {item.blocked ? (
                    <button style={styles.dangerSoftButton} onClick={() => deviceAction(item.phone, "unblock")}>Unblock</button>
                  ) : (
                    <button style={styles.dangerButton} onClick={() => deviceAction(item.phone, "block")}>Block</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.card}>
          <h2>Notification Settings</h2>
          {notificationSettings ? (
            <div style={styles.grid}>
              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={Boolean(notificationSettings.volatilityEnabled)}
                  onChange={(e) => setNotificationSettings((prev) => ({ ...prev, volatilityEnabled: e.target.checked }))}
                />
                High Volatility Notification
              </label>
              <div>
                <label style={styles.label}>Cooldown Minutes</label>
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  value={notificationSettings.volatilityCooldownMinutes || 10}
                  onChange={(e) => setNotificationSettings((prev) => ({ ...prev, volatilityCooldownMinutes: e.target.value }))}
                />
              </div>
              <div>
                <label style={styles.label}>English Message</label>
                <textarea style={styles.textarea} value={notificationSettings.volatilityMessageEn || ""} onChange={(e) => setNotificationSettings((prev) => ({ ...prev, volatilityMessageEn: e.target.value }))} />
              </div>
              <div>
                <label style={styles.label}>Hindi Message</label>
                <textarea style={styles.textarea} value={notificationSettings.volatilityMessageHi || ""} onChange={(e) => setNotificationSettings((prev) => ({ ...prev, volatilityMessageHi: e.target.value }))} />
              </div>
              <button style={styles.primaryButton} onClick={saveNotifications}>Save Notification Settings</button>
            </div>
          ) : (
            <p style={styles.subtitle}>Loading notification settings...</p>
          )}
        </section>

        <section style={styles.card}>
          <h2>Target Alerts</h2>
          {targetAlerts.length === 0 ? <p style={styles.subtitle}>No active target alerts.</p> : null}
          {targetAlerts.map((alert) => (
            <div key={alert.id} style={styles.rowCard}>
              <div>
                <strong>{alert.name || alert.phone}</strong>
                <p style={styles.mini}>📱 {alert.phone}</p>
              </div>
              <div>
                <strong>{rateLabel(alert.rateType)} {conditionLabel(alert.condition)} ₹{formatPrice(alert.targetRate)}</strong>
                <p style={styles.mini}>Created: {formatDate(alert.createdAt)}</p>
              </div>
              <button style={styles.dangerButton} onClick={() => removeTargetAlert(alert.id)}>Remove Alert</button>
            </div>
          ))}
        </section>

        <section style={styles.card}>
          <h2>Feedback</h2>
          {feedback.length === 0 ? <p style={styles.subtitle}>No feedback yet.</p> : null}
          {feedback.map((item) => (
            <div key={item.id} style={styles.rowCard}>
              <div>
                <strong>{item.name || "User"}</strong>
                <p style={styles.mini}>📱 {item.phone || "--"} · {formatDate(item.createdAt)}</p>
              </div>
              <p style={styles.feedbackText}>{item.message}</p>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #2b2414 0%, #0d0d0d 38%, #050505 100%)",
    color: "#f3d98b",
    fontFamily: "Arial, Helvetica, sans-serif",
    padding: 18,
    boxSizing: "border-box",
  },
  shell: { maxWidth: 1180, margin: "0 auto" },
  loginCard: { maxWidth: 430, margin: "70px auto", background: "rgba(20,20,20,.96)", border: "1px solid rgba(214,180,92,.32)", borderRadius: 24, padding: 24, textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 18 },
  headerActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  title: { margin: 0, color: "#f3d98b" },
  subtitle: { color: "#aaa", marginTop: 6 },
  form: { marginTop: 18 },
  card: { background: "rgba(255,255,255,.045)", border: "1px solid rgba(214,180,92,.22)", borderRadius: 18, padding: 16, marginBottom: 16 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 },
  tableWrap: { display: "grid", gap: 10, marginTop: 14 },
  deviceCard: { display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr auto", gap: 12, alignItems: "center", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 12 },
  rowCard: { display: "grid", gridTemplateColumns: "1fr 1.4fr auto", gap: 12, alignItems: "center", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 12, marginTop: 10 },
  actions: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  input: { width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid rgba(214,180,92,.38)", color: "#f3d98b", borderRadius: 12, padding: "12px 13px", margin: "6px 0 12px" },
  textarea: { width: "100%", minHeight: 90, boxSizing: "border-box", background: "#080808", border: "1px solid rgba(214,180,92,.38)", color: "#f3d98b", borderRadius: 12, padding: "12px 13px" },
  label: { color: "#bbb", fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" },
  labelSmall: { color: "#999", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em" },
  mini: { margin: "5px 0", color: "#aaa", fontSize: 9 },
  message: { color: "#f3d98b" },
  messageBox: { padding: 12, borderRadius: 12, border: "1px solid rgba(214,180,92,.25)", marginBottom: 14, background: "rgba(214,180,92,.08)" },
  primaryButton: { border: "1px solid rgba(214,180,92,.55)", background: "rgba(214,180,92,.18)", color: "#f3d98b", borderRadius: 12, padding: "12px 14px", fontWeight: 800, cursor: "pointer" },
  smallButton: { textDecoration: "none", border: "1px solid rgba(214,180,92,.35)", background: "rgba(214,180,92,.08)", color: "#f3d98b", borderRadius: 4, padding: "5px 6px", fontWeight: 100, cursor: "pointer" },
  dangerButton: { border: "1px solid rgba(255,120,120,.35)", background: "rgba(120,20,20,.32)", color: "#ffd6d6", borderRadius: 4, padding: "5px 6px", fontWeight: 100, cursor: "pointer" },
  dangerSoftButton: { border: "1px solid rgba(255,210,120,.35)", background: "rgba(214,180,92,.08)", color: "#f3d98b", borderRadius: 4, padding: "5px 6px", fontWeight: 100, cursor: "pointer" },
  checkRow: { display: "flex", alignItems: "center", gap: 8, color: "#f3d98b" },
  feedbackText: { color: "#ddd", whiteSpace: "pre-wrap", lineHeight: 1.5 },
};

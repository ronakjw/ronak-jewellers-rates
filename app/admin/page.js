"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
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
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  where,
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
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = "rrmctexim@gmail.com";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [changeLogs, setChangeLogs] = useState([]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantCommand, setAssistantCommand] = useState("");
  const [assistantPreview, setAssistantPreview] = useState(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantListening, setAssistantListening] = useState(false);
  const [assistantMode, setAssistantMode] = useState("command");
  const [assistantAdvice, setAssistantAdvice] = useState("");
  
    useEffect(() => {
  if (!user) return;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const q = query(
    collection(db, "changeLogs"),
    where("createdAt", ">=", cutoff),
    orderBy("createdAt", "desc"),
    limit(25)
  );

  return onSnapshot(q, (snapshot) => {
    setChangeLogs(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  });
}, [user]);
  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);
 
  useEffect(() => {
    if (!user) return;

    return onSnapshot(doc(db, "settings", "bullion"), (snapshot) => {
      setSettings(snapshot.data());
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    loadSystemStatus();

    const interval = setInterval(loadSystemStatus, 30000);

    return () => clearInterval(interval);
  }, [user]);
function applyAssistantChanges() {
  if (!assistantPreview) return;

  setSettings((prev) => ({
    ...prev,
    ...assistantPreview,
  }));

  setAssistantPreview(null);
  setAssistantCommand("");
  setMessage("AI changes applied. Click Save Settings to update website.");
}
  async function loadSystemStatus() {
    try {
      const res = await fetch("/api/health", {
        cache: "no-store",
      });

      const data = await res.json();
      setSystemStatus(data);
    } catch (err) {
      setSystemStatus({
        website: "online",
        kite: false,
        error: err.message,
      });
    }
  }
async function askGeminiAdvice() {
  if (!assistantCommand.trim()) {
    setMessage("Please enter a question.");
    return;
  }

  setAssistantLoading(true);
  setAssistantAdvice("");

  try {
    const res = await fetch("/api/assistant-advice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: assistantCommand,
        currentSettings: settings,
        systemStatus,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      setMessage(data.message || "Gemini advice failed.");
      return;
    }

    setAssistantAdvice(data.advice);
  } catch (err) {
    setMessage(err.message || "Gemini advice failed.");
  } finally {
    setAssistantLoading(false);
  }
}  
function startGeminiVoice() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setMessage("Voice recognition is not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  setAssistantListening(true);

  recognition.start();

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;

    setAssistantCommand(transcript);
    setAssistantListening(false);

    setTimeout(() => {
      runAssistantCommand();
    }, 300);
  };

  recognition.onerror = () => {
    setAssistantListening(false);
    setMessage("Voice recognition failed.");
  };

  recognition.onend = () => {
    setAssistantListening(false);
  };
}
  
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
    } catch {
      setMessage("Login failed. Check email/password.");
    }
  }
async function runAssistantCommand() {
  if (!assistantCommand.trim()) return;

  setAssistantLoading(true);

  try {
    const res = await fetch("/api/assistant-command",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      body: JSON.stringify({
      command: assistantCommand,
      currentSettings: settings,
     }),    
      }
    );

    const data = await res.json();

    if (!data.success) {
      setMessage(
        data.message || "Gemini failed."
      );
      return;
    }

    setAssistantPreview(
      data.changes || {}
    );
  } catch (err) {
    setMessage(err.message);
  } finally {
    setAssistantLoading(false);
  }
}
  async function saveSettings(e) {
    e.preventDefault();

    if (!settings) return;

    const buyingPremium = parseInt(settings.buyingPremium || 0, 10);
    const sellingPremium = parseInt(settings.sellingPremium || 0, 10);
    const oldSettings = settings;

const newSettings = {
  buyingPremium,
  sellingPremium,
  showRates: Boolean(settings.showRates),
  autoContract: Boolean(settings.autoContract),
  manualContract: String(settings.manualContract || "").trim(),
  marketStartHour: Number(settings.marketStartHour || 12),
  marketEndHour: Number(settings.marketEndHour || 21),
  refreshBefore530: Number(settings.refreshBefore530 || 7),
  refreshAfter530: Number(settings.refreshAfter530 || 2),
  kachhiBadlaEnabled: Boolean(settings.kachhiBadlaEnabled),
  kachhiBadlaValue: parseInt(settings.kachhiBadlaValue || 0, 10),
  kachhiBadlaUnit: String(settings.kachhiBadlaUnit || "Rs/kg"),
  holidayMode: Boolean(settings.holidayMode),
  holidayBuyingRate: parseInt(settings.holidayBuyingRate || 0, 10),
  holidaySellingRate: parseInt(settings.holidaySellingRate || 0, 10),
  noticeMessage: String(settings.noticeMessage || "").trim(),
  autoPremiumEnabled: Boolean(settings.autoPremiumEnabled),
  showPremium: Boolean(settings.showPremium),
  premiumStepSize: parseInt(settings.premiumStepSize || 1000, 10),
  premiumStepAdjustment: parseInt(settings.premiumStepAdjustment || 500, 10),
  volatilityWarningEnabled: Boolean(settings.volatilityWarningEnabled),
};
 if (!settings.autoContract && !String(settings.manualContract || "").trim()) 
 {  setMessage("Manual contract cannot be empty.");
    return;
  }
    setSaving(true);
    setMessage("");

    try {
     await updateDoc(doc(db, "settings", "bullion"), newSettings);

const previousLog = {
  buyingPremium: Number(oldSettings.buyingPremium || 0),
  sellingPremium: Number(oldSettings.sellingPremium || 0),
  showRates: Boolean(oldSettings.showRates),
  autoContract: Boolean(oldSettings.autoContract),
  manualContract: String(oldSettings.manualContract || ""),
  holidayMode: Boolean(oldSettings.holidayMode),
  holidayBuyingRate: Number(oldSettings.holidayBuyingRate || 0),
  holidaySellingRate: Number(oldSettings.holidaySellingRate || 0),
  kachhiBadlaEnabled: Boolean(oldSettings.kachhiBadlaEnabled),
  kachhiBadlaValue: Number(oldSettings.kachhiBadlaValue || 0),
  kachhiBadlaUnit: String(oldSettings.kachhiBadlaUnit || "Rs/kg"),
  autoPremiumEnabled: Boolean(oldSettings.autoPremiumEnabled),
  showPremium: Boolean(oldSettings.showPremium),
  premiumStepSize: Number(oldSettings.premiumStepSize || 1000),
  premiumStepAdjustment: Number(oldSettings.premiumStepAdjustment || 500),
  volatilityWarningEnabled: Boolean(oldSettings.volatilityWarningEnabled),
  noticeMessage: String(oldSettings.noticeMessage || ""),
};

const currentLog = {
  buyingPremium: newSettings.buyingPremium,
  sellingPremium: newSettings.sellingPremium,
  showRates: newSettings.showRates,
  autoContract: newSettings.autoContract,
  manualContract: newSettings.manualContract,
  holidayMode: newSettings.holidayMode,
  holidayBuyingRate: newSettings.holidayBuyingRate,
  holidaySellingRate: newSettings.holidaySellingRate,
  kachhiBadlaEnabled: newSettings.kachhiBadlaEnabled,
  kachhiBadlaValue: newSettings.kachhiBadlaValue,
  kachhiBadlaUnit: newSettings.kachhiBadlaUnit,
  autoPremiumEnabled: newSettings.autoPremiumEnabled,
  showPremium: newSettings.showPremium,
  premiumStepSize: newSettings.premiumStepSize,
  premiumStepAdjustment: newSettings.premiumStepAdjustment,
  volatilityWarningEnabled: newSettings.volatilityWarningEnabled,
  noticeMessage: newSettings.noticeMessage,
};

const hasChanges = Object.keys(currentLog).some(
  (key) => previousLog[key] !== currentLog[key]
);

if (hasChanges) {
  await addDoc(collection(db, "changeLogs"), {
    createdAt: serverTimestamp(),
    updatedBy: user.email,
    previous: previousLog,
    current: currentLog,
  });
}

      setMessage("Settings saved successfully.");
      loadSystemStatus();
    } catch {
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
function ToggleRow({ label, checked, onChange }) {
  return (
    <div style={styles.toggleRow}>
      <span style={styles.toggleLabel}>{label}</span>

      <button
        type="button"
        style={{
          ...styles.toggleSwitch,
          background: checked
            ? "rgba(214,180,92,0.85)"
            : "rgba(255,255,255,0.12)",
        }}
        onClick={() => onChange(!checked)}
      >
        <span
          style={{
            ...styles.toggleKnob,
            transform: checked
              ? "translateX(22px)"
              : "translateX(0)",
          }}
        />
      </button>
    </div>
  );
}
  if (!user) {
    return (
      <main style={styles.page}>
        <section style={styles.loginCard}>
          <Image
            src="/logo.png"
            alt="Ronak Jewellers"
            width={200}
            height={200}
            style={styles.logoCenter}
          />

          <h1 style={styles.title}>Ronak Jewellers</h1>
          <p style={styles.subtitle}>Admin Login</p>
           <form onSubmit={login} style={styles.form}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
           <div style={{ height: 14 }} />
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
        <Image
          src="/logo.png"
          alt="Ronak Jewellers"
          width={200}
          height={200}
        />
        <h1 style={styles.title}>Loading admin...</h1>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.adminShell}>
        <div style={styles.headerRow}>
          <div style={styles.headerBrand}>
            <Image
              src="/logo.png"
              alt="Ronak Jewellers"
              width={150}
              height={150}
            />

            <div>
              <h1>RJ - Admin Panel</h1>
              <p style={styles.subtitle}>Ronak Jewellers Live Rates</p>
            </div>
          </div>

 <div style={styles.adminButtonRows}>
  <button
    type="button"
    style={styles.topButton}
    onClick={saveSettings}
    disabled={saving}
  >
    {saving ? "Saving..." : "Save"}
  </button>

  <a
    href="/"
    target="_blank"
    rel="noopener noreferrer"
    style={styles.topButton}
  >
    Open Site
  </a>

  <button
    type="button"
    style={styles.topButton}
    onClick={() => signOut(auth)}
  >
    Logout
  </button>
</div>
        </div>

        <div style={styles.systemCard}>
          <StatusItem
            label="Website"
            ok={systemStatus?.website === "online"}
            value={systemStatus?.website === "online" ? "Online" : "Issue"}
          />

          <StatusItem
            label="Kite"
            ok={Boolean(systemStatus?.kite)}
            value={systemStatus?.kite ? "Connected" : "Disconnected"}
          />

          <StatusItem
            label="Contract"
            ok={Boolean(systemStatus?.contract)}
            value={systemStatus?.contract || "--"}
          />

          <button
            type="button"
            style={styles.smallButton}
            onClick={loadSystemStatus}
          >
            Refresh Status
          </button>

          <a href="/api/login" style={styles.reconnectButton}>
            Reconnect Kite
          </a>
        </div>

        {systemStatus?.error ? (
          <div style={styles.errorBox}>{systemStatus.error}</div>
        ) : null}

        <form onSubmit={saveSettings} style={styles.grid}>
  
  <ToggleRow
  label="Show Premium"
  checked={Boolean(settings.showPremium)}
  onChange={(value) => updateField("showPremium", value)}/>
 
  <ToggleRow
  label="Show Rates"
  checked={Boolean(settings.showRates)}
  onChange={(value) => updateField("showRates", value)}/>

  <ToggleRow
  label={`Contract Mode: ${
    settings.contractMode === "auto"
      ? "AUTO" : "MANUAL" }`}
  checked={settings.contractMode === "auto"}
  onChange={(value) =>
    updateField(
      "contractMode",
      value ? "auto" : "manual"
    )}/>

  <ToggleRow
  label="Holiday Mode"
  checked={Boolean(settings.holidayMode)}
  onChange={(value) => updateField("holidayMode", value)}/>

  <ToggleRow
  label="Kachhi Badla"
  checked={Boolean(settings.kachhiBadlaEnabled)}
  onChange={(value) => updateField("kachhiBadlaEnabled", value)} />

<ToggleRow
  label={`Kachhi Badla Unit: ${
    settings.kachhiBadlaUnit === "Rs/kg"
      ? "Rs/kg"
      : "gm/kg"
  }`}
  checked={settings.kachhiBadlaUnit === "Rs/kg"}
  onChange={(value) =>
    updateField(
      "kachhiBadlaUnit",
      value ? "Rs/kg" : "gm/kg"
    )
  }
/>

  <ToggleRow
  label="Auto Premium"
  checked={Boolean(settings.autoPremiumEnabled)}
  onChange={(value) => updateField("autoPremiumEnabled", value)}
  />
 <ToggleRow
  label="Volatility Warning"
  checked={Boolean(settings.volatilityWarningEnabled)}
  onChange={(value) => updateField("volatilityWarningEnabled", value)}
/>   
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
            <label style={styles.label}>Manual Contract</label>
            <input
              style={styles.input}
              value={settings.manualContract || ""}
              onChange={(e) =>
                updateField("manualContract", e.target.value.toUpperCase())
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
            <label style={styles.label}>Refresh Before 5:30 PM / sec</label>
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
  <label style={styles.label}>Holiday Buying Rate</label>
  <input
    style={styles.input}
    type="number"
    value={settings.holidayBuyingRate || 0}
    onChange={(e) =>
      updateField("holidayBuyingRate", e.target.value)
    }
  />
</div>

<div style={styles.controlCard}>
  <label style={styles.label}>Holiday Selling Rate</label>
  <input
    style={styles.input}
    type="number"
    value={settings.holidaySellingRate || 0}
    onChange={(e) =>
      updateField("holidaySellingRate", e.target.value)
    }
  />
</div>
          <div style={styles.controlCard}>
            <label style={styles.label}>Refresh After 5:30 PM / sec</label>
            <input
              style={styles.input}
              type="number"
              value={settings.refreshAfter530}
              onChange={(e) =>
                updateField("refreshAfter530", e.target.value)
              }
            />
          </div>

<div style={styles.controlCard}>
  <label style={styles.label}>Kachhi Badla Value</label>
  <input
    style={styles.input}
    type="number"
    value={settings.kachhiBadlaValue || 0}
    onChange={(e) =>
      updateField("kachhiBadlaValue", e.target.value)
    }
  />
</div>

<div style={styles.controlCard}>
  <label style={styles.label}>MCX Step Size</label>
  <input
    style={styles.input}
    type="number"
    value={settings.premiumStepSize || 1000}
    onChange={(e) =>
      updateField("premiumStepSize", e.target.value)
    }
  />
</div>

<div style={styles.controlCard}>
  <label style={styles.label}>Premium Adj.</label>
  <input
    style={styles.input}
    type="number"
    value={settings.premiumStepAdjustment || 500}
    onChange={(e) =>
      updateField("premiumStepAdjustment", e.target.value)
    }
  />
</div>
    
    <div style={styles.controlCardWide}>
  <label style={styles.label}>Note / Message</label>

  <textarea
    style={styles.assistantTextarea}
    value={settings.noticeMessage || ""}
    onChange={(e) =>
      updateField("noticeMessage", e.target.value)
    }
    placeholder="Leave empty to hide"
    rows={4}
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
        
<div style={styles.logSection}>
  <button
    type="button"
    style={styles.logToggle}
    onClick={() => setShowLogs(!showLogs)}
  >
    {showLogs ? "Hide Change Log" : "Show Change Log"}
  </button>

  {showLogs ? (
    <>
      <h2> Change Log</h2>

      {changeLogs.length === 0 ? (
        <p style={styles.subtitle}>
          No changes recorded in the last 90 days.
        </p>
      ) : (
        changeLogs.map((log) => (
  <div key={log.id} style={styles.logCardNew}>
  <div style={styles.logDateCol}>
    {log.createdAt?.toDate
      ? log.createdAt.toDate().toLocaleString("en-IN")
      : "Just now"}
  </div>

  <div style={styles.logChangesCol}>
    {[
      log.previous?.buyingPremium !== log.current?.buyingPremium && (
        <p style={styles.logText} key="buyingPremium">
          Buying Premium: {log.previous?.buyingPremium} →{" "}
          {log.current?.buyingPremium}
        </p>
      ),

      log.previous?.sellingPremium !== log.current?.sellingPremium && (
        <p style={styles.logText} key="sellingPremium">
          Selling Premium: {log.previous?.sellingPremium} →{" "}
          {log.current?.sellingPremium}
        </p>
      ),

      log.previous?.showRates !== log.current?.showRates && (
        <p style={styles.logText} key="showRates">
          Rates: {log.previous?.showRates ? "Show" : "Hide"} →{" "}
          {log.current?.showRates ? "Show" : "Hide"}
        </p>
      ),

      log.previous?.autoContract !== log.current?.autoContract ||
      log.previous?.manualContract !== log.current?.manualContract ? (
        <p style={styles.logText} key="contract">
          Contract:{" "}
          {log.previous?.autoContract
            ? "Auto"
            : log.previous?.manualContract}{" "}
          →{" "}
          {log.current?.autoContract
            ? "Auto"
            : log.current?.manualContract}
        </p>
      ) : null,
    ].filter(Boolean)}

    {[
      log.previous?.buyingPremium !== log.current?.buyingPremium,
      log.previous?.sellingPremium !== log.current?.sellingPremium,
      log.previous?.showRates !== log.current?.showRates,
      log.previous?.autoContract !== log.current?.autoContract ||
        log.previous?.manualContract !== log.current?.manualContract,
    ].every((item) => !item) ? (
      <p style={styles.logText}>No visible setting change.</p>
    ) : null}
  </div>
</div>
        )))}
    </>
  ) : null}
</div> 
{assistantOpen && (
  <div style={styles.assistantPopup}>
    <h3 style={styles.assistantTitle}>
      🤖 Gemini Assistant
    </h3>
<div style={styles.assistantTabs}>
  <button
    type="button"
    style={
      assistantMode === "command"
        ? styles.assistantTabActive
        : styles.assistantTab
    }
    onClick={() => setAssistantMode("command")}
  >
    Command
  </button>

  <button
    type="button"
    style={
      assistantMode === "advice"
        ? styles.assistantTabActive
        : styles.assistantTab
    }
    onClick={() => setAssistantMode("advice")}
  >
    Advice
  </button>
</div>
   <div style={styles.textareaWrapper}>
  <textarea
    style={styles.assistantTextarea}
    value={assistantCommand}
    onChange={(e) =>
      setAssistantCommand(e.target.value)
    }
  />

  {assistantCommand && (
    <button
      type="button"
      style={styles.textareaClear}
      onClick={() => setAssistantCommand("")}
    >
      ✕
    </button>
  )}
</div>
<button
  type="button"
  style={styles.voiceButton}
  onClick={startGeminiVoice}
>
  {assistantListening ? "🎙️ Listening..." : "🎤 Speak to Gemini"}
</button>
   
  <button
  type="button"
  style={styles.primaryButton}
  onClick={
    assistantMode === "command"
      ? runAssistantCommand
      : askGeminiAdvice
  }
  disabled={assistantLoading}
>
  {assistantLoading
    ? "Thinking..."
    : assistantMode === "command"
    ? "Ask Gemini"
    : "Ask Advice"}
</button>

    {assistantPreview && (
      <div style={styles.assistantPreview}>
        <h4>Detected Changes</h4>

        {Object.entries(
          assistantPreview
        ).map(([key, value]) => (
          <p key={key}>
            {key}: {String(value)}
          </p>
        ))}

        <button
          type="button"
          style={styles.primaryButton}
          onClick={applyAssistantChanges}
        >
          Apply Changes
        </button>
      </div>
    )}
      {assistantAdvice ? (
  <div style={styles.assistantPreview}>
    <h4>Gemini Advice</h4>
    <p style={{ whiteSpace: "pre-wrap" }}>{assistantAdvice}</p>
  </div>
) : null}
  </div>
)}
  <button
  type="button"
  style={styles.assistantFab}
  onClick={() =>
    setAssistantOpen(!assistantOpen)
  }
>
  🤖
</button>
      </section>
    </main>
  );
}

function StatusItem({ label, ok, value }) {
  return (
    <div style={styles.systemItem}>
      <span
        style={{
          ...styles.systemDot,
          background: ok ? "#d6b45c" : "#9b2c2c",
        }}
      />
      <span>
        {label}: <strong>{value}</strong>
      </span>
    </div>
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
  assistantTabs: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  marginBottom: 12,
},
textareaWrapper: {
  position: "relative",
},
logCardNew: {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 14,
  marginBottom: 12,
  display: "grid",
  gridTemplateColumns: "180px 1fr",
  gap: 18,
},
logDateCol: {
  color: "#9f9f9f",
  fontSize: 13,
},
logChangesCol: {
  color: "#f3d98b",
},
textareaClear: {
  position: "absolute",
  top: 10,
  right: 10,
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "none",
  background: "rgba(255,255,255,0.1)",
  color: "#f3d98b",
  cursor: "pointer",
},
assistantTab: {
  border: "1px solid rgba(214,180,92,0.25)",
  background: "rgba(214,180,92,0.05)",
  color: "#9f9f9f",
  borderRadius: 10,
  padding: "10px",
  cursor: "pointer",
},
assistantTabActive: {
  border: "1px solid rgba(214,180,92,0.55)",
  background: "rgba(214,180,92,0.18)",
  color: "#f3d98b",
  borderRadius: 10,
  padding: "10px",
  fontWeight: 800,
  cursor: "pointer",
},
voiceButton: {
  width: "100%",
  marginTop: 10,
  marginBottom: 10,
  border: "1px solid rgba(214,180,92,0.35)",
  background: "rgba(214,180,92,0.08)",
  color: "#f3d98b",
  borderRadius: 12,
  padding: "12px 14px",
  fontWeight: 800,
  cursor: "pointer",
},
assistantFab: {
  position: "fixed",
  right: 20,
  bottom: 20,
  width: 64,
  height: 64,
  borderRadius: "50%",
  border: "1px solid rgba(214,180,92,0.55)",
  background: "linear-gradient(145deg, rgba(214,180,92,0.28), rgba(35,35,35,0.95))",
  color: "#f3d98b",
  fontSize: 30,
  cursor: "pointer",
  zIndex: 9999,
},
assistantPopup: {
  position: "fixed",
  left: 12,
  right: 12,
  bottom: 90,
  maxHeight: "75vh",
  overflowY: "auto",
  background: "linear-gradient(145deg, rgba(31,31,31,0.98), rgba(10,10,10,0.98))",
  border: "1px solid rgba(214,180,92,0.32)",
  borderRadius: 18,
  padding: 16,
  zIndex: 9999,
  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
},
assistantTextarea: {
  width: "100%",
  minHeight: 120,
  resize: "vertical",
  background: "rgba(255,255,255,0.05)",
  border: "1px",
  borderRadius: 4,
  color: "#fff",
  padding: 7,
  boxSizing: "border-box",
},
assistantTitle: {
  color: "#f3d98b",
  marginTop: 0,
},
assistantPreview: {
  marginTop: 14,
  color: "#f3d98b",
},
  toggleRow: {
  border: "1px",
  padding: "6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
},
toggleLabel: {
  color: "#c6c6c6",
  fontSize: 14,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
},
toggleSwitch: {
  width: 52,
  height: 28,
  borderRadius: 999,
  border: "1px solid rgba(214,180,92,0.35)",
  padding: 3,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  transition: "0.6s ease",
},
toggleKnob: {
  width: 20,
  height: 20,
  borderRadius: "50%",
  background: "#080808",
  transition: "0.6s ease",
},
  headerRow: {
  display: "flex",
  flexDirection: "column",
  gap: 18,
  alignItems: "stretch",
  marginBottom: 22,
},
  headerBrand: {
  display: "flex",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
},
  adminButtonRow: {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10,
  width: "100%",
},
  topButton: {
  textDecoration: "none",
  border: "1px solid rgba(214,180,92,0.35)",
  background: "rgba(214,180,92,0.08)",
  color: "#f3d98b",
  borderRadius: 12,
  padding: "12px 10px",
  textAlign: "center",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
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

  loginCard: {
    width: "100%",
    maxWidth: 430,
    margin: "70px auto",
    background:
      "linear-gradient(145deg, rgba(31,31,31,0.96), rgba(10,10,10,0.96))",
    border: "1px solid rgba(214,180,92,0.32)",
    borderRadius: 26,
    padding: 24,
    boxShadow: "0 26px 80px rgba(0,0,0,0.55)",
    boxSizing: "border-box",
    textAlign: "center",
  },

  logoCenter: {
    display: "block",
    margin: "0 auto 18px",
  },

  adminShell: {
    width: "100%",
    maxWidth: 1060,
    margin: "0 auto",
    background:
      "linear-gradient(145deg, rgba(31,31,31,0.96), rgba(10,10,10,0.96))",
    border: "1px solid rgba(214,180,92,0.32)",
    borderRadius: 26,
    padding: 24,
    boxShadow: "0 26px 80px rgba(0,0,0,0.55)",
    boxSizing: "border-box",
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
    borderRadius: 12,
    padding: 8,
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
  quickActions: {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
},

saveTopButton: {
  border: "1px solid rgba(214,180,92,0.55)",
  background:
    "linear-gradient(145deg, rgba(214,180,92,0.28), rgba(35,35,35,0.92))",
  color: "#f3d98b",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
},

openSiteButton: {
  textDecoration: "none",
  border: "1px solid rgba(214,180,92,0.35)",
  background: "rgba(214,180,92,0.08)",
  color: "#f3d98b",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 800,
},
  systemCard: {
    marginBottom: 22,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
    border: "1px solid rgba(214,180,92,0.22)",
    borderRadius: 18,
    padding: 16,
    display: "flex",
    gap: 14,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },

  systemItem: {
    color: "#f3d98b",
    fontSize: 15,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  systemDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    boxShadow: "0 0 10px rgba(214,180,92,0.8)",
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

  smallButton: {
    border: "1px solid rgba(214,180,92,0.35)",
    background: "rgba(214,180,92,0.08)",
    color: "#f3d98b",
    borderRadius: 12,
    padding: "9px 13px",
    cursor: "pointer",
  },

  reconnectButton: {
    textDecoration: "none",
    border: "1px solid rgba(214,180,92,0.55)",
    background:
      "linear-gradient(145deg, rgba(214,180,92,0.24), rgba(35,35,35,0.92))",
    color: "#f3d98b",
    borderRadius: 12,
    padding: "9px 13px",
    fontWeight: 800,
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

  errorBox: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 14,
    color: "#ffd6d6",
    background: "rgba(120, 20, 20, 0.35)",
    border: "1px solid rgba(255, 120, 120, 0.25)",
  },
  logSection: {
  marginTop: 28,
  borderTop: "1px solid rgba(214,180,92,0.22)",
  paddingTop: 22,
},
  
logToggle: {
  width: "100%",
  border: "1px solid rgba(214,180,92,0.35)",
  background: "rgba(214,180,92,0.08)",
  color: "#f3d98b",
  borderRadius: 14,
  padding: "13px 16px",
  fontSize: 16,
  fontWeight: 800,
  cursor: "pointer",
},
logText: {
  color: "#f3d98b",
  margin: "6px 0",
  fontSize: 14,
},
};

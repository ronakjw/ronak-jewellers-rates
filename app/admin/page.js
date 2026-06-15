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
  const [savedSettings, setSavedSettings] = useState(null);
  
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
     const data = snapshot.data();
     setSettings(data);
     setSavedSettings(data);
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
  function toNumber(value, fallback = 0) {
    if (value === "" || value === null || value === undefined) {
      return fallback;
    }

    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function buildLogSnapshot(source = {}) {
    return {
      buyingPremium: toNumber(source.buyingPremium, 0),
      sellingPremium: toNumber(source.sellingPremium, 0),
      showRates: Boolean(source.showRates),
      autoContract: Boolean(source.autoContract),
      contractMode: source.autoContract ? "auto" : "manual",
      manualContract: String(source.manualContract || ""),
      holidayMode: Boolean(source.holidayMode),
      holidayBuyingRate: toNumber(source.holidayBuyingRate, 0),
      holidaySellingRate: toNumber(source.holidaySellingRate, 0),
      kachhiBadlaEnabled: Boolean(source.kachhiBadlaEnabled),
      kachhiBadlaValue: toNumber(source.kachhiBadlaValue, 0),
      kachhiBadlaUnit: String(source.kachhiBadlaUnit || "Rs/kg"),
      autoPremiumEnabled: Boolean(source.autoPremiumEnabled),
      showPremium: Boolean(source.showPremium),
      premiumStepSize: toNumber(source.premiumStepSize, 1000),
      premiumStepAdjustment: toNumber(source.premiumStepAdjustment, 500),
      volatilityWarningEnabled: Boolean(source.volatilityWarningEnabled),
      noticeMessage: String(source.noticeMessage || ""),
      silver100rate: Boolean(source.silver100rate),
      silver100buy: toNumber(source.silver100buy, 0),
      silver100sell: toNumber(source.silver100sell, 0),
      ShowGoldRate: Boolean(source.ShowGoldRate),
      ShowGoldPrem: Boolean(source.ShowGoldPrem),
      GoldBuyPrem: toNumber(source.GoldBuyPrem, 0),
      GoldSellPrem: toNumber(source.GoldSellPrem, 0),
      GoldRoundoffMultiple: toNumber(source.GoldRoundoffMultiple, 100),
      GoldManualContract: String(source.GoldManualContract || ""),
      GoldAutoPremiumEnabled: Boolean(source.GoldAutoPremiumEnabled),
      GoldPremiumStepSize: toNumber(source.GoldPremiumStepSize, 100),
      GoldPremiumStepAdjustment: toNumber(source.GoldPremiumStepAdjustment, 50),
      showGoldHolidayRate: Boolean(source.showGoldHolidayRate),
      goldHolidayBuyingRate: toNumber(source.goldHolidayBuyingRate, 0),
      goldHolidaySellingRate: toNumber(source.goldHolidaySellingRate, 0),
    };
  }

  async function saveSettings(e) {
    e?.preventDefault?.();

    if (!settings) return;

    const autoContract =
      settings.contractMode === "auto"
        ? true
        : settings.contractMode === "manual"
        ? false
        : Boolean(settings.autoContract);

    const newSettings = {
      buyingPremium: toNumber(settings.buyingPremium, 0),
      sellingPremium: toNumber(settings.sellingPremium, 0),
      showRates: Boolean(settings.showRates),
      autoContract,
      contractMode: autoContract ? "auto" : "manual",
      manualContract: String(settings.manualContract || "").trim().toUpperCase(),
      marketStartHour: toNumber(settings.marketStartHour, 12),
      marketEndHour: toNumber(settings.marketEndHour, 21),
      refreshBefore530: toNumber(settings.refreshBefore530, 7),
      refreshAfter530: toNumber(settings.refreshAfter530, 2),
      kachhiBadlaEnabled: Boolean(settings.kachhiBadlaEnabled),
      kachhiBadlaValue: toNumber(settings.kachhiBadlaValue, 0),
      kachhiBadlaUnit: String(settings.kachhiBadlaUnit || "Rs/kg"),
      holidayMode: Boolean(settings.holidayMode),
      holidayBuyingRate: toNumber(settings.holidayBuyingRate, 0),
      holidaySellingRate: toNumber(settings.holidaySellingRate, 0),
      noticeMessage: String(settings.noticeMessage || "").trim(),
      autoPremiumEnabled: Boolean(settings.autoPremiumEnabled),
      showPremium: Boolean(settings.showPremium),
      premiumStepSize: Math.max(1, toNumber(settings.premiumStepSize, 1000)),
      premiumStepAdjustment: toNumber(settings.premiumStepAdjustment, 500),
      volatilityWarningEnabled: Boolean(settings.volatilityWarningEnabled),
      silver100rate: Boolean(settings.silver100rate),
      silver100buy: toNumber(settings.silver100buy, 0),
      silver100sell: toNumber(settings.silver100sell, 0),
      ShowGoldRate: Boolean(settings.ShowGoldRate),
      ShowGoldPrem: Boolean(settings.ShowGoldPrem),
      GoldBuyPrem: toNumber(settings.GoldBuyPrem, 0),
      GoldSellPrem: toNumber(settings.GoldSellPrem, 0),
      GoldRoundoffMultiple: Math.max(1, toNumber(settings.GoldRoundoffMultiple, 100)),
      GoldManualContract: String(settings.GoldManualContract || "").trim().toUpperCase(),
      GoldAutoPremiumEnabled: Boolean(settings.GoldAutoPremiumEnabled),
      GoldPremiumStepSize: Math.max(1, toNumber(settings.GoldPremiumStepSize, 100)),
      GoldPremiumStepAdjustment: toNumber(settings.GoldPremiumStepAdjustment, 50),
      showGoldHolidayRate: Boolean(settings.showGoldHolidayRate),
      goldHolidayBuyingRate: toNumber(settings.goldHolidayBuyingRate, 0),
      goldHolidaySellingRate: toNumber(settings.goldHolidaySellingRate, 0),
    };

    if (!newSettings.autoContract && !newSettings.manualContract) {
      setMessage("Manual silver contract cannot be empty.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await updateDoc(doc(db, "settings", "bullion"), newSettings);
      setSavedSettings(newSettings);

      const previousLog = buildLogSnapshot(savedSettings || settings);
      const currentLog = buildLogSnapshot(newSettings);

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
    } catch (err) {
      setMessage(
        err?.message
          ? `Save failed: ${err.message}`
          : "Save failed. Check Firestore rules."
      );
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
  <div>
  <ToggleRow
  label="Show Silver Premium"
  checked={Boolean(settings.showPremium)}
  onChange={(value) => updateField("showPremium", value)}/>

  <ToggleRow
  label="Show Gold Premium"
  checked={Boolean(settings.ShowGoldPrem)}
  onChange={(value) => updateField("ShowGoldPrem", value)}/>
 
  <ToggleRow
  label="Show All Rates"
  checked={Boolean(settings.showRates)}
  onChange={(value) => updateField("showRates", value)}/>

  <ToggleRow
  label="Show Gold Rate"
  checked={Boolean(settings.ShowGoldRate)}
  onChange={(value) => updateField("ShowGoldRate", value)}/>

  <ToggleRow
  label="Show 999 Rates"
  checked={Boolean(settings.silver100rate)}
  onChange={(value) => updateField("silver100rate", value)}/>
    
  <ToggleRow
  label={`Contract Mode: ${
    Boolean(settings.autoContract) ? "AUTO" : "MANUAL"
  }`}
  checked={Boolean(settings.autoContract)}
  onChange={(value) => {
    updateField("autoContract", value);
    updateField("contractMode", value ? "auto" : "manual");
  }}/>

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
  label="Silver Auto Premium"
  checked={Boolean(settings.autoPremiumEnabled)}
  onChange={(value) => updateField("autoPremiumEnabled", value)}
  />
 <ToggleRow
  label="Volatility Warning"
  checked={Boolean(settings.volatilityWarningEnabled)}
  onChange={(value) => updateField("volatilityWarningEnabled", value)}
/>  
    <ToggleRow
  label="Show Gold Holiday Rate"
  checked={Boolean(settings.showGoldHolidayRate)}
  onChange={(value) => updateField("showGoldHolidayRate", value)}
/>
    <ToggleRow
  label="Gold Auto Premium"
  checked={Boolean(settings.GoldAutoPremiumEnabled)}
  onChange={(value) =>
    updateField("GoldAutoPremiumEnabled", value)
  }
/>
    </div>    
<div>
    <div style={styles.controlCard}>
            <label style={styles.label}>Silver99 Buy Prem.</label>
            <input
              style={styles.input}
              type="text"
              value={settings.buyingPremium ?? ""}
               inputMode="decimal"
              onChange={(e) =>
                updateField("buyingPremium", e.target.value)
              }
            />
          </div>

          <div style={styles.controlCard}>
            <label style={styles.label}>Silver99 Sell Prem.</label>
            <input
              style={styles.input}
              type="text"
               inputMode="decimal"
              value={settings.sellingPremium ?? ""}
              onChange={(e) => updateField("sellingPremium", e.target.value)}
            />
          </div>          
<div style={styles.controlCard}>
  <label style={styles.label}>Silver100 BuyPrem.</label>
  <input
    style={styles.input}
    type="text"
    inputMode="decimal"
    value={settings.silver100buy ?? ""}
    onChange={(e) => updateField("silver100buy", e.target.value)}
  />
</div>

<div style={styles.controlCard}>
  <label style={styles.label}>Silver100 SellPrem.</label>
  <input
    style={styles.input}
    type="text"
    inputMode="decimal"
    value={settings.silver100sell ?? ""}
    onChange={(e) => updateField("silver100sell", e.target.value)}
  />
</div>        
<div style={styles.controlCard}>
  <label style={styles.label}>Gold Buy Prem.</label>
  <input
    style={styles.input}
    type="text"
     inputMode="decimal"
    value={settings.GoldBuyPrem ?? ""}
    onChange={(e) => updateField("GoldBuyPrem", e.target.value)}
  />
</div>
<div style={styles.controlCard}>
  <label style={styles.label}>Gold Sell Prem.</label>
  <input
    style={styles.input}
    type="text"
     inputMode="decimal"
    value={settings.GoldSellPrem ?? ""}
    onChange={(e) => updateField("GoldSellPrem", e.target.value)}
  />
</div>
    
</div> 
 <div>
<div style={styles.controlCard}>
  <label style={styles.label}>Gold Holiday Buy</label>
  <input
    style={styles.input}
    type="number"
    value={settings.goldHolidayBuyingRate || 0}
    onChange={(e) =>
      updateField("goldHolidayBuyingRate", e.target.value)
    }
  />
</div>

<div style={styles.controlCard}>
  <label style={styles.label}>Gold Holiday Sell</label>
  <input
    style={styles.input}
    type="number"
    value={settings.goldHolidaySellingRate || 0}
    onChange={(e) =>
      updateField("goldHolidaySellingRate", e.target.value)
    }
  />
</div>
<div style={styles.controlCard}>
  <label style={styles.label}>Silver Holiday Buy</label>
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
  <label style={styles.label}>Silver Holiday Sell</label>
  <input
    style={styles.input}
    type="number"
    value={settings.holidaySellingRate || 0}
    onChange={(e) =>
      updateField("holidaySellingRate", e.target.value)
    }
  />
</div>
 </div>

<div> 

<div style={styles.controlCard}>
  <label style={styles.label}>Silver MCX Step Size</label>
  <input
    style={styles.input}
    type="text"
     inputMode="decimal"
    value={settings.premiumStepSize ?? ""}
    onChange={(e) =>
      updateField("premiumStepSize", e.target.value)
    }
  />
</div>

<div style={styles.controlCard}>
  <label style={styles.label}>Silver Premium Adj.</label>
  <input
    style={styles.input}
    type="text"
     inputMode="decimal"
    value={settings.premiumStepAdjustment ?? ""}
    onChange={(e) =>
      updateField("premiumStepAdjustment", e.target.value)
    }
  />
</div>

<div style={styles.controlCard}>
  <label style={styles.label}> Gold MCX Step Size
  </label>
  <input
    style={styles.input}
    type="text"
     inputMode="decimal"
    value={settings.GoldPremiumStepSize ?? ""}
    onChange={(e) =>
      updateField(
        "GoldPremiumStepSize",
        e.target.value
      )
    }
  />
</div>

<div style={styles.controlCard}>
  <label style={styles.label}>  Gold Premium Adj.
  </label>
  <input
    style={styles.input}
    type="text"
     inputMode="decimal"
    value={ settings.GoldPremiumStepAdjustment ?? "" }
    onChange={(e) =>
      updateField(
        "GoldPremiumStepAdjustment",
        e.target.value
      )
    }
  />
</div>
<div style={styles.controlCard}>
  <label style={styles.label}>Gold Roundoff Multiple</label>
  <input
    style={styles.input}
    type="text"
     inputMode="decimal"
    value={settings.GoldRoundoffMultiple ?? ""}
    onChange={(e) =>
      updateField("GoldRoundoffMultiple", e.target.value)
    }
  />
</div>
 </div>    
    <div> 
    <div style={styles.controlCard}>
  <label style={styles.label}>Kachhi Badla Value</label>
  <input
    style={styles.input}
    type="text"
    inputMode="decimal"
    value={settings.kachhiBadlaValue ?? ""}
    onChange={(e) =>
      updateField("kachhiBadlaValue", e.target.value)
    }
  />
</div>

          <div style={styles.controlCard}>
            <label style={styles.label}>Manual Silver Contract</label>
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
            <label style={styles.label}>Manual Gold Contract</label>
            <input
              style={styles.input}
              value={settings.GoldManualContract || ""}
              onChange={(e) =>
                updateField("GoldManualContract", e.target.value.toUpperCase())
              }
              placeholder="Leave blank for auto / GOLD26AUGFUT"
            />
          </div>
    </div> 

    <div>
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
                </div>
                <div>
          <div style={styles.controlCard}>
            <label style={styles.label}>Refresh Before 5:30PM</label>
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
            <label style={styles.label}>Refresh After 5:30PM</label>
            <input
              style={styles.input}
              type="number"
              value={settings.refreshAfter530}
              onChange={(e) =>
                updateField("refreshAfter530", e.target.value)
              }
            />
          </div>
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
  {Object.entries({
    buyingPremium: "Buying Premium",
    sellingPremium: "Selling Premium",
    showRates: "Rates",
    holidayMode: "Holiday Mode",
    holidayBuyingRate: "Holiday Buying Rate",
    holidaySellingRate: "Holiday Selling Rate",
    kachhiBadlaEnabled: "Kachhi Badla",
    kachhiBadlaValue: "Kachhi Badla Value",
    kachhiBadlaUnit: "Kachhi Badla Unit",
    autoPremiumEnabled: "Auto Premium",
    showPremium: "Show Premium",
    premiumStepSize: "Premium Step Size",
    premiumStepAdjustment: "Premium Adjustment",
    volatilityWarningEnabled: "Volatility Warning",
    silver100rate: "Show 999 Rates",
    silver100buy: "Silver100 Buy Premium",
    silver100sell: "Silver100 Sell Premium",
    GoldBuyPrem: "Gold Buy Premium",
    GoldSellPrem: "Gold Sell Premium",
    ShowGoldRate: "Show Gold 995 Rate",
    ShowGoldPrem: "Show Gold Premium",
    GoldRoundoffMultiple: "Gold Roundoff Multiple",
    GoldManualContract: "Manual Gold Contract",
    GoldAutoPremiumEnabled: "Gold Auto Premium",
    GoldPremiumStepSize: "Gold MCX Step Size",
    GoldPremiumStepAdjustment: "Gold Premium Adjustment",
    showGoldHolidayRate: "Show Gold Holiday Rate",
    goldHolidayBuyingRate: "Gold Holiday Buying Rate",
    goldHolidaySellingRate: "Gold Holiday Selling Rate",
    noticeMessage: "Note",
  })
    .filter(([key]) => log.previous?.[key] !== log.current?.[key])
    .map(([key, label]) => (
      <p style={styles.logText} key={key}>
        {label}: {formatLogValue(key, log.previous?.[key])} →{" "}
        {formatLogValue(key, log.current?.[key])}
      </p>
    ))}

  {log.previous?.autoContract !== log.current?.autoContract ||
  log.previous?.manualContract !== log.current?.manualContract ? (
    <p style={styles.logText}>
      Contract:{" "}
      {log.previous?.autoContract ? "Auto" : log.previous?.manualContract} →{" "}
      {log.current?.autoContract ? "Auto" : log.current?.manualContract}
    </p>
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
function formatLogValue(key, value) {
  if (
    [
      "showRates",
      "kachhiBadlaEnabled",
      "showPremium",
      "ShowGoldRate",
      "ShowGoldPrem",
      "silver100rate",
      "showGoldHolidayRate",
    ].includes(key)
  ) {
    return value ? "Show" : "Hide";
  }

  if (
    [
      "holidayMode",
      "autoPremiumEnabled",
      "volatilityWarningEnabled",
      "GoldAutoPremiumEnabled",
    ].includes(key)
  ) {
    return value ? "On" : "Off";
  }

  if (value === "" || value === undefined || value === null) {
    return "--";
  }

  return String(value);
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
  padding: 11,
  marginBottom: 8,
  display: "grid",
  gridTemplateColumns: "180px 1fr",
  gap: 11,
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
  margin: "2px 0",
  fontSize: 11,
},
};

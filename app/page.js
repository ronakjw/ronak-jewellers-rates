"use client";

import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function Home() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "bullion"),
      (snapshot) => {
        setSettings(snapshot.data());
      }
    );

    return () => unsub();
  }, []);

  if (!settings) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0d0d0d",
          color: "#d4af37",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial",
        }}
      >
        Loading...
      </main>
    );
  }

  if (!settings.showRates) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0d0d0d",
          color: "#d4af37",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial",
          padding: 20,
          textAlign: "center",
        }}
      >
        <h1>Ronak Jewellers</h1>
        <p>Live rates are currently unavailable.</p>

        <a href="tel:9479893898">📞 9479893898</a>
        <br />
        <a href="tel:9300053012">📞 9300053012</a>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0d0d0d",
        color: "#d4af37",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial",
        padding: 20,
      }}
    >
      <h1 style={{ fontSize: 42 }}>
        Ronak Jewellers
      </h1>

      <div
        style={{
          background: "#1b1b1b",
          border: "1px solid #555",
          borderRadius: 18,
          padding: 25,
          width: "100%",
          maxWidth: 450,
          textAlign: "center",
          marginTop: 20,
        }}
      >
        <p>MCX Silver Rate</p>
        <h2>₹1,08,500 / kg</h2>

        <p>
          Buying Premium:
          {" "}
          {settings.buyingPremium}
        </p>

        <p>
          Selling Premium:
          {" "}
          {settings.sellingPremium}
        </p>
      </div>

      <div style={{ marginTop: 30 }}>
        <a href="tel:9479893898">
          📞 9479893898
        </a>

        <br />
        <br />

        <a href="tel:9300053012">
          📞 9300053012
        </a>
      </div>
    </main>
  );
}

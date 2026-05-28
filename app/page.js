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

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN").format(price);
}

export default function Home() {
  const [settings, setSettings] = useState(null);
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "bullion"),
      (snapshot) => {
        setSettings(snapshot.data());
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const res = await fetch("/api/kite-quote");
        const data = await res.json();
        setQuote(data);
      } catch (err) {
        console.error(err);
      }
    }

    fetchQuote();

    const interval = setInterval(fetchQuote, 7000);

    return () => clearInterval(interval);
  }, []);

  if (!settings || !quote) {
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
          textAlign: "center",
          padding: 20,
        }}
      >
        <h1>Ronak Jewellers</h1>

        <p>
          Please call for current bullion rates.
        </p>

        <a href="tel:9479893898">
          📞 9479893898
        </a>

        <br />
        <br />

        <a href="tel:9300053012">
          📞 9300053012
        </a>
      </main>
    );
  }

  const finalBuying =
    quote.mcxBuyPrice + settings.buyingPremium;

  const finalSelling =
    quote.mcxSellPrice + settings.sellingPremium;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0d0d0d",
        color: "#d4af37",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 20,
        fontFamily: "Arial",
      }}
    >
      <h1
        style={{
          marginTop: 40,
          fontSize: 42,
        }}
      >
        Ronak Jewellers
      </h1>

      <div
        style={{
          background: "#1b1b1b",
          border: "1px solid #444",
          borderRadius: 20,
          padding: 25,
          width: "100%",
          maxWidth: 500,
          marginTop: 30,
        }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: 30,
          }}
        >
          {quote.contract}
        </h2>

        <p>
          MCX Buy Price:
        </p>

        <h2>
          ₹{formatPrice(quote.mcxBuyPrice)} / kg
        </h2>

        <p>
          Buying Premium:
        </p>

        <h3>
          ₹{formatPrice(settings.buyingPremium)}
        </h3>

        <p>
          Final Buying Rate:
        </p>

        <h1>
          ₹{formatPrice(finalBuying)} / kg
        </h1>

        <hr
          style={{
            margin: "30px 0",
            borderColor: "#333",
          }}
        />

        <p>
          MCX Sell Price:
        </p>

        <h2>
          ₹{formatPrice(quote.mcxSellPrice)} / kg
        </h2>

        <p>
          Selling Premium:
        </p>

        <h3>
          ₹{formatPrice(settings.sellingPremium)}
        </h3>

        <p>
          Final Selling Rate:
        </p>

        <h1>
          ₹{formatPrice(finalSelling)} / kg
        </h1>

        <p
          style={{
            marginTop: 30,
            color: "#888",
            fontSize: 14,
          }}
        >
          Last Updated:
          {" "}
          {quote.timestamp}
        </p>
      </div>

      <div
        style={{
          marginTop: 40,
          textAlign: "center",
        }}
      >
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

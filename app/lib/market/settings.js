
import { adminDb } from "../../lib/firebaseAdmin";
import { toBool, cleanSymbol } from "./utils";

export async function getSettings() {
  const snap = await adminDb.collection("settings").doc("bullion").get();
  const data = snap.data() || {};

  const contractMode = String(data.contractMode || "").toLowerCase();

  return {
    autoContract:
      contractMode === "auto"
        ? true
        : contractMode === "manual"
        ? false
        : toBool(data.autoContract, true),

    manualContract: cleanSymbol(data.manualContract),

    goldManualContract: cleanSymbol(
      data.GoldManualContract || data.goldManualContract
    ),

    holidayMode: toBool(data.holidayMode, false),
  };
}

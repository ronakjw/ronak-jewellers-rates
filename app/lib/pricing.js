// Shared pricing/rounding logic — extracted from app/rates/page.js so the
// admin panel's live preview computes rates using the exact same rules the
// public site uses. If you ever change premium/rounding logic, update it
// here (or keep both copies in sync — see note in the admin preview file).

export function formatPrice(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatPremium(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPrice(value)}`;
}

export function compactMoney(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return formatPrice(value);
}

export function compactPremium(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return formatPremium(value);
}

export function getAutoPremium(basePremium, currentMcx, openingMcx, settings) {
  const base = Number(basePremium || 0);

  if (!settings.autoPremiumEnabled) {
    return base;
  }

  const current = Number(currentMcx);
  const opening = Number(openingMcx);
  const stepSize = Math.max(1, Number(settings.premiumStepSize || 1000));
  const adjustment = Number(settings.premiumStepAdjustment || 500);

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(opening) ||
    current <= 0 ||
    opening <= 0
  ) {
    return base;
  }

  const difference = current - opening;
  const steps = Math.trunc(difference / stepSize);

  return base - steps * adjustment;
}

export function getGoldAutoPremium(basePremium, currentMcx, openingMcx, settings) {
  const base = Number(basePremium || 0);

  if (!settings.GoldAutoPremiumEnabled) {
    return base;
  }

  const current = Number(currentMcx);
  const opening = Number(openingMcx);
  const stepSize = Math.max(1, Number(settings.GoldPremiumStepSize || 100));
  const adjustment = Number(settings.GoldPremiumStepAdjustment || 50);

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(opening) ||
    current <= 0 ||
    opening <= 0
  ) {
    return base;
  }

  const difference = current - opening;
  const steps = Math.trunc(difference / stepSize);

  return base - steps * adjustment;
}

export function roundToNearest500(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.floor((amount + 249) / 500) * 500;
}

export function roundDownToMultiple(value, multiple) {
  const amount = Number(value);
  const roundBy = Math.max(1, Number(multiple || 1));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.floor(amount / roundBy) * roundBy;
}

export function roundUpToMultiple(value, multiple) {
  const amount = Number(value);
  const roundBy = Math.max(1, Number(multiple || 1));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.ceil(amount / roundBy) * roundBy;
}

// Builds the same row shape CompactRatesTable expects, from a quote object
// and a settings object (draft or saved — caller decides which).
export function buildCompactRateRows(quote, settings) {
  if (!quote || !settings) return [];

  const buyingPremium = getAutoPremium(
    settings.buyingPremium,
    quote.mcxBuyPrice,
    quote.mcxOpeningRate,
    settings
  );
  const sellingPremium = getAutoPremium(
    settings.sellingPremium,
    quote.mcxSellPrice,
    quote.mcxOpeningRate,
    settings
  );

  const silverMcxBuy = Number(quote.mcxBuyPrice);
  const silverMcxSell = Number(quote.mcxSellPrice);

  const rawFinalBuying =
    Number.isFinite(silverMcxBuy) && silverMcxBuy > 0 ? silverMcxBuy + buyingPremium : null;
  const rawFinalSelling =
    Number.isFinite(silverMcxSell) && silverMcxSell > 0 ? silverMcxSell + sellingPremium : null;

  const finalBuying = settings.showPremium ? rawFinalBuying : roundToNearest500(rawFinalBuying);
  const finalSelling = settings.showPremium ? rawFinalSelling : roundToNearest500(rawFinalSelling);

  const silver100BuyPremium = Number(settings.silver100buy || 0);
  const silver100SellPremium = Number(settings.silver100sell || 0);

  const silver100Buying = finalBuying === null ? null : finalBuying + silver100BuyPremium;
  const silver100Selling = finalSelling === null ? null : finalSelling + silver100SellPremium;

  const goldBuyPremium = getGoldAutoPremium(settings.GoldBuyPrem, quote.goldMcxBuyPrice, quote.goldOpeningRate, settings);
  const goldSellPremium = getGoldAutoPremium(settings.GoldSellPrem, quote.goldMcxSellPrice, quote.goldOpeningRate, settings);
  const goldRoundoffMultiple = Math.max(1, Number(settings.GoldRoundoffMultiple || 100));
  const goldMcxBuy = Number(quote.goldMcxBuyPrice);
  const goldMcxSell = Number(quote.goldMcxSellPrice);

  const rawGoldFinalBuying =
    Number.isFinite(goldMcxBuy) && goldMcxBuy > 0 ? goldMcxBuy + goldBuyPremium : null;
  const rawGoldFinalSelling =
    Number.isFinite(goldMcxSell) && goldMcxSell > 0 ? goldMcxSell + goldSellPremium : null;

  const goldFinalBuying = roundDownToMultiple(rawGoldFinalBuying, goldRoundoffMultiple);
  const goldFinalSelling = roundUpToMultiple(rawGoldFinalSelling, goldRoundoffMultiple);

  return [
    {
      id: "silver99",
      compactTitle: "Silver 99",
      mcxBuy: quote.mcxBuyPrice,
      mcxSell: quote.mcxSellPrice,
      buyPremium: settings.showPremium ? buyingPremium : null,
      sellPremium: settings.showPremium ? sellingPremium : null,
      finalBuying,
      finalSelling,
    },
    ...(settings.silver100rate
      ? [
          {
            id: "silver100",
            compactTitle: "Silver 100",
            mcxBuy: quote.mcxBuyPrice,
            mcxSell: quote.mcxSellPrice,
            buyPremium: settings.showPremium ? buyingPremium + silver100BuyPremium : null,
            sellPremium: settings.showPremium ? sellingPremium + silver100SellPremium : null,
            finalBuying: silver100Buying,
            finalSelling: silver100Selling,
          },
        ]
      : []),
    ...(Boolean(settings.ShowGoldRate) && !quote.goldError
      ? [
          {
            id: "gold995",
            compactTitle: "Gold 995",
            mcxBuy: quote.goldMcxBuyPrice,
            mcxSell: quote.goldMcxSellPrice,
            buyPremium: settings.ShowGoldPrem ? goldBuyPremium : null,
            sellPremium: settings.ShowGoldPrem ? goldSellPremium : null,
            finalBuying: goldFinalBuying,
            finalSelling: goldFinalSelling,
          },
        ]
      : []),
  ];
}

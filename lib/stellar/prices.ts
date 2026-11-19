import { Asset } from "@stellar/stellar-sdk";
import { formatUnits, parseUnits, trimBalance } from "../money";
import { getServer, usdcAsset } from "./server";

let cached: { at: number; price: string } | null = null;

function pathAsset(record: { asset_type: string; asset_code?: string; asset_issuer?: string }): Asset {
  if (record.asset_type === "native" || !record.asset_code || !record.asset_issuer) return Asset.native();
  return new Asset(record.asset_code, record.asset_issuer);
}

export async function quoteStrictSend(from: Asset, to: Asset, amount: string) {
  const page = await getServer().strictSendPaths(from, amount, [to]).call();
  const best = page.records[0];
  if (!best) return null;
  return {
    sourceAmount: best.source_amount,
    destinationAmount: best.destination_amount,
    path: best.path.map((asset) => pathAsset(asset)),
  };
}

export async function getXlmUsdPrice(): Promise<string> {
  if (cached && Date.now() - cached.at < 30_000) return cached.price;
  try {
    const quote = await quoteStrictSend(Asset.native(), usdcAsset(), "10.0000000");
    if (quote) {
      const perXlm = parseUnits(trimBalance(quote.destinationAmount)) / 10n;
      const price = formatUnits(perXlm, 4);
      cached = { at: Date.now(), price };
      return price;
    }
  } catch {
    // Fall through to the order book.
  }

  const book = await getServer().orderbook(Asset.native(), usdcAsset()).call();
  const bid = book.bids[0] ? Number(book.bids[0].price) : 0;
  const ask = book.asks[0] ? Number(book.asks[0].price) : 0;
  const mid = bid && ask ? (bid + ask) / 2 : bid || ask;
  if (!mid) throw new Error("Testnet DEX has no XLM/USDC price right now.");
  const price = mid.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  cached = { at: Date.now(), price };
  return price;
}

export async function requestCircleUsdc(publicKey: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const response = await fetch("https://faucet.circle.com/api/faucet", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ address: publicKey, blockchain: "stellar-testnet" }),
    });
    const text = await response.text();
    if (!response.ok) return { ok: false, detail: text.slice(0, 180) };
    return { ok: true, detail: text.slice(0, 180) };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "Faucet request failed" };
  }
}

import { HttpError } from "../errors";

export type SmsProviderName = "demo" | "africastalking" | "twilio";

export type SmsRequest = {
  url: string;
  headers: Record<string, string>;
  body: string;
};

export type SmsResponse = {
  ok: boolean;
  status: number;
  text: string;
};

export type SmsTransport = (request: SmsRequest) => Promise<SmsResponse>;

const defaultTransport: SmsTransport = async (request) => {
  const response = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: request.body,
  });
  return { ok: response.ok, status: response.status, text: await response.text() };
};

let transport: SmsTransport = defaultTransport;

/** Tests replace the HTTP call. Production uses fetch. */
export function setSmsTransport(next: SmsTransport | null): void {
  transport = next ?? defaultTransport;
}

type Env = Record<string, string | undefined>;

export function resolveSmsProvider(env: Env = process.env): SmsProviderName | "unconfigured" {
  const raw = env.SMS_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === "demo") {
    return env.DEMO_MODE === "false" ? "unconfigured" : "demo";
  }
  if (raw === "africastalking" || raw === "africas-talking" || raw === "africas_talking") return "africastalking";
  if (raw === "twilio") return "twilio";
  throw new HttpError("SMS_PROVIDER must be demo, africastalking, or twilio.");
}

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new HttpError(`Set ${name} before sending SMS. See .env.example.`);
  return value;
}

export function loginMessage(code: string): string {
  return `Lipila code: ${code}. It expires in 10 minutes. Stellar testnet sandbox, not a real payment.`;
}

export async function sendAfricasTalking(
  phone: string,
  message: string,
  env: Env = process.env,
): Promise<void> {
  const username = required(env, "AT_USERNAME");
  const apiKey = required(env, "AT_API_KEY");
  const url = env.AT_API_URL?.trim() || "https://api.africastalking.com/version1/messaging";
  const body = new URLSearchParams({ username, to: phone, message });
  const sender = env.AT_SENDER_ID?.trim();
  if (sender) body.set("from", sender);
  const response = await transport({
    url,
    headers: {
      apiKey,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!response.ok) throw new HttpError("Africa's Talking could not send the code.");
  let statusCode = 0;
  try {
    const data = JSON.parse(response.text) as {
      SMSMessageData?: { Recipients?: { statusCode?: number }[] };
    };
    statusCode = data.SMSMessageData?.Recipients?.[0]?.statusCode ?? 0;
  } catch {
    throw new HttpError("Africa's Talking returned an unreadable response.");
  }
  if (!statusCode || statusCode >= 400) {
    throw new HttpError("Africa's Talking could not deliver to that number.");
  }
}

export async function sendTwilio(
  phone: string,
  message: string,
  env: Env = process.env,
): Promise<void> {
  const sid = required(env, "TWILIO_ACCOUNT_SID");
  const token = required(env, "TWILIO_AUTH_TOKEN");
  const from = required(env, "TWILIO_FROM_NUMBER");
  const body = new URLSearchParams({ To: phone, From: from, Body: message });
  const response = await transport({
    url: `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!response.ok) throw new HttpError("Twilio could not send the code.");
}

export async function deliverOtp(
  phone: string,
  code: string,
  env: Env = process.env,
): Promise<{ provider: SmsProviderName; exposeCode: boolean }> {
  const provider = resolveSmsProvider(env);
  if (provider === "unconfigured") {
    throw new HttpError("SMS is not configured. Set SMS_PROVIDER to africastalking or twilio.");
  }
  if (provider === "demo") return { provider, exposeCode: true };
  const message = loginMessage(code);
  if (provider === "africastalking") await sendAfricasTalking(phone, message, env);
  else await sendTwilio(phone, message, env);
  return { provider, exposeCode: false };
}

export async function deliverNotice(
  phone: string,
  message: string,
  env: Env = process.env,
): Promise<"sent" | "skipped" | "failed"> {
  const provider = resolveSmsProvider(env);
  if (provider !== "africastalking" && provider !== "twilio") return "skipped";
  try {
    if (provider === "africastalking") await sendAfricasTalking(phone, message, env);
    else await sendTwilio(phone, message, env);
    return "sent";
  } catch {
    return "failed";
  }
}

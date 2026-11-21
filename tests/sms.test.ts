import { afterEach, describe, expect, it } from "vitest";
import { HttpError } from "../lib/errors";
import { resetStoreForTests, getStore } from "../lib/store";
import { requestOtp } from "../lib/service/auth";
import {
  deliverOtp,
  loginMessage,
  resolveSmsProvider,
  sendAfricasTalking,
  sendTwilio,
  setSmsTransport,
  type SmsRequest,
} from "../lib/sms";

const KEY = "ab".repeat(32);

afterEach(() => {
  setSmsTransport(null);
  delete process.env.SMS_PROVIDER;
  delete process.env.DEMO_MODE;
  delete process.env.AT_API_KEY;
  delete process.env.AT_USERNAME;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_FROM_NUMBER;
});

describe("SMS providers", () => {
  it("stays on the on-screen demo when no provider is configured", () => {
    expect(resolveSmsProvider({ DEMO_MODE: "true" })).toBe("demo");
    expect(resolveSmsProvider({ DEMO_MODE: "false" })).toBe("unconfigured");
    expect(resolveSmsProvider({ SMS_PROVIDER: "africastalking", DEMO_MODE: "false" })).toBe("africastalking");
    expect(resolveSmsProvider({ SMS_PROVIDER: "twilio" })).toBe("twilio");
  });

  it("posts to Africa's Talking without putting the key or code in the error", async () => {
    const seen: SmsRequest[] = [];
    setSmsTransport(async (request) => {
      seen.push(request);
      return { ok: false, status: 401, text: `{"error":"bad key"}` };
    });
    const env = { AT_USERNAME: "sandbox", AT_API_KEY: "at-secret-key", AT_SENDER_ID: "LIPILA" };
    await expect(sendAfricasTalking("+260971234567", loginMessage("123456"), env)).rejects.toThrow(HttpError);
    try {
      await sendAfricasTalking("+260971234567", loginMessage("123456"), env);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      expect(message).not.toContain("at-secret-key");
      expect(message).not.toContain("123456");
    }
    expect(seen[0]?.headers.apiKey).toBe("at-secret-key");
    expect(seen[0]?.body).toContain("to=%2B260971234567");
    expect(seen[0]?.body).toContain("username=sandbox");
    expect(seen[0]?.body).toContain("from=LIPILA");
  });

  it("accepts an Africa's Talking success code", async () => {
    setSmsTransport(async () => ({
      ok: true,
      status: 201,
      text: JSON.stringify({ SMSMessageData: { Recipients: [{ statusCode: 101, status: "Success" }] } }),
    }));
    await expect(
      sendAfricasTalking("+260971234567", "hello", { AT_USERNAME: "sandbox", AT_API_KEY: "key" }),
    ).resolves.toBeUndefined();
  });

  it("posts to Twilio without leaking the token", async () => {
    let body = "";
    setSmsTransport(async (request) => {
      body = request.body;
      return { ok: false, status: 401, text: "auth" };
    });
    const env = {
      TWILIO_ACCOUNT_SID: "ACxxxxxxxx",
      TWILIO_AUTH_TOKEN: "twilio-secret-token",
      TWILIO_FROM_NUMBER: "+10000000000",
    };
    await expect(sendTwilio("+260971234567", loginMessage("654321"), env)).rejects.toThrow(/Twilio could not send/);
    expect(body).toContain("To=%2B260971234567");
    expect(body).toContain("654321");
    expect(body).not.toContain("twilio-secret-token");
  });

  it("hides the code once a real provider accepts it", async () => {
    setSmsTransport(async () => ({ ok: true, status: 201, text: "{}" }));
    const env = {
      SMS_PROVIDER: "twilio",
      DEMO_MODE: "false",
      TWILIO_ACCOUNT_SID: "ACxxxxxxxx",
      TWILIO_AUTH_TOKEN: "token",
      TWILIO_FROM_NUMBER: "+10000000000",
    };
    const sent = await deliverOtp("+260971234567", "111111", env);
    expect(sent).toEqual({ provider: "twilio", exposeCode: false });
  });
});

describe("sign-in codes", () => {
  it("stores only a hash in demo mode and drops the code if SMS fails", async () => {
    process.env.LIPILA_STORE = "memory";
    process.env.DEMO_MODE = "true";
    process.env.SMS_PROVIDER = "demo";
    process.env.WALLET_ENCRYPTION_KEY = KEY;
    process.env.SESSION_SECRET = "session-secret-for-tests";
    resetStoreForTests();

    const demo = await requestOtp("97 123 4567");
    expect(demo.delivery).toBe("demo");
    expect(demo.demoCode).toMatch(/^\d{6}$/);
    const store = await getStore();
    const otp = await store.getOtp("+260971234567");
    expect(otp?.codeHash).toBeTruthy();
    expect(otp?.codeHash).not.toBe(demo.demoCode);

    process.env.SMS_PROVIDER = "twilio";
    process.env.TWILIO_ACCOUNT_SID = "ACxxxxxxxx";
    process.env.TWILIO_AUTH_TOKEN = "twilio-secret-token";
    process.env.TWILIO_FROM_NUMBER = "+10000000000";
    setSmsTransport(async () => ({ ok: false, status: 500, text: "nope" }));
    await expect(requestOtp("+260971234567")).rejects.toThrow(/Twilio could not send/);
    expect(await store.getOtp("+260971234567")).toBeNull();
  });
});

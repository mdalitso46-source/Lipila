import { HttpError } from "./errors";

const E164 = /^\+260[79]\d{8}$/;

export function normalizePhone(input: string): string {
  const compact = input.replace(/[\s()-]/g, "");
  let national = compact;
  if (national.startsWith("+260")) national = national.slice(4);
  else if (national.startsWith("260")) national = national.slice(3);
  else if (national.startsWith("0")) national = national.slice(1);

  const phone = `+260${national}`;
  if (!E164.test(phone)) {
    throw new HttpError("Enter a Zambian mobile number, like 97 123 4567.");
  }
  return phone;
}

export function formatPhone(phone: string): string {
  const national = phone.startsWith("+260") ? phone.slice(4) : phone;
  if (national.length !== 9) return phone;
  return `+260 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
}

export function maskPhone(phone: string): string {
  const national = phone.startsWith("+260") ? phone.slice(4) : phone;
  if (national.length !== 9) return phone;
  return `+260 ${national.slice(0, 2)} ••• ${national.slice(5)}`;
}

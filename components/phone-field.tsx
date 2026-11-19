"use client";

export function PhoneField({
  value,
  onChange,
  label = "Mobile number",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="phone-box">
        <b>+260</b>
        <input
          inputMode="numeric"
          autoComplete="tel"
          placeholder="97 123 4567"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d\s]/g, "").slice(0, 12))}
        />
      </span>
    </label>
  );
}

export function fullPhone(national: string): string {
  return `+260${national.replace(/\D/g, "")}`;
}

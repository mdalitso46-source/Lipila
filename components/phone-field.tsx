"use client";

function Flag() {
  return (
    <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true">
      <rect width="18" height="13" rx="2" fill="#198A43" />
      <rect x="12.2" width="1.7" height="13" fill="#EF7D00" />
      <rect x="13.9" width="1.7" height="13" fill="#111111" />
      <rect x="15.6" width="2.4" height="13" fill="#DE2010" />
    </svg>
  );
}

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
        <span className="flag">
          <Flag />
          +260
        </span>
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

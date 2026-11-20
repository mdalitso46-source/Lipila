"use client";

function Flag() {
  return (
    <svg className="flag-svg" width="22" height="15" viewBox="0 0 22 15" aria-hidden="true">
      <rect width="22" height="15" rx="2" fill="#198A43" />
      <rect x="15" width="2.2" height="15" fill="#EF7D00" />
      <rect x="17.2" width="2.2" height="15" fill="#111" />
      <rect x="19.4" width="2.6" height="15" fill="#DE2010" />
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
      {label ? <span>{label}</span> : null}
      <span className="phone-box">
        <span className="flag">
          <Flag />
          +260
        </span>
        <input
          className="tnum"
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

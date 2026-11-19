export function Mark({ light = false }: { light?: boolean }) {
  return (
    <span className="mark" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" fill={light ? "#f3ecdf" : "#c56a2d"} />
        <path d="M5.2 9h7.6M9 5.2v7.6" stroke={light ? "#1c1915" : "#fffdf8"} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className="brand">
      <Mark light={light} />
      <span className="word">Lipila</span>
    </span>
  );
}

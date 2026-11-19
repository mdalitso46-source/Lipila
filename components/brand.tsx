export function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M5 4.2v9.6h8" stroke="#F4F7F4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="13.5" cy="4.6" r="1.25" fill="#C4A265" />
      </svg>
    </span>
  );
}

export function Brand({ href }: { href?: string; light?: boolean }) {
  const inner = (
    <>
      <Mark />
      <span className="logo-word">Lipila</span>
    </>
  );
  if (href) {
    return (
      <a className="logo" href={href}>
        {inner}
      </a>
    );
  }
  return <span className="logo">{inner}</span>;
}

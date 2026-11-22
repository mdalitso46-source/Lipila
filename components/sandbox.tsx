export function SandboxNotice({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <p className={tone === "dark" ? "sandbox dark" : "sandbox"} role="status">
      <span className="sandbox-dot" aria-hidden="true" />
      Testnet sandbox · not real money
    </p>
  );
}

import Image from "next/image";

export function Logo({ size = 28 }: { size?: number; title?: string }) {
  return <Image className="mark" src="/logo.svg" width={size} height={size} alt="" unoptimized />;
}

export function Wordmark({ inverse = false, size = 28 }: { inverse?: boolean; size?: number }) {
  return (
    <span className={`wordmark ${inverse ? "inverse" : ""}`}>
      <Logo size={size} title="Lipila" />
      <span>Lipila</span>
    </span>
  );
}

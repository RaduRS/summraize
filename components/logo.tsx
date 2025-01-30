import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="relative font-bold text-xl px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-background to-muted rounded-lg shadow-[inset_0_0_1px_1px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_1px_1px_rgba(255,255,255,0.1)]" />
      <span className="relative">
        <span>summr</span>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
          ai
        </span>
        <span>ze</span>
      </span>
    </Link>
  );
}

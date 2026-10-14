import { Link } from "react-router-dom";

export default function BackLink({ to = "/", className = "" }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 rounded-pill border-2 border-ink bg-panel px-3.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-ink press ${className}`.trim()}
    >
      ← Back
    </Link>
  );
}

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="mt-4 flex max-w-md items-center justify-between gap-3 rounded-chunky border-2 border-status-red-text bg-[#FEE2E2] p-3 text-status-red-text shadow-hard-sm">
      <span className="font-mono text-xs font-bold uppercase tracking-wider">
        Error: {message}
      </span>
      <button
        onClick={onRetry}
        className="shrink-0 rounded-pill border-2 border-status-red-text bg-cream px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider shadow-hard-sm hover:bg-status-red hover:text-cream transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

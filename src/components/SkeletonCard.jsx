export default function SkeletonCard({ withHeart = false }) {
  return (
    <div className="min-h-[160px] sm:aspect-square sm:min-h-0 flex flex-col justify-between rounded-card border-3 border-ink bg-panel p-3.5 sm:p-5 md:p-6 shadow-hard animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-4 w-10 rounded-pill bg-panel-inset" />
        {withHeart ? (
          <div className="h-7 w-7 rounded-full bg-panel-inset" />
        ) : (
          <div className="h-3 w-3 rounded-full bg-panel-inset" />
        )}
      </div>
      <div>
        <div
          className={`mb-2 h-3 ${
            withHeart ? "w-16" : "w-14"
          } rounded-pill bg-panel-inset`}
        />
        <div className="h-6 sm:h-8 w-4/5 rounded-chunky bg-panel-inset mb-2.5" />
        <div
          className={`${
            withHeart ? "hidden sm:block w-24" : "w-3/5"
          } h-3.5 rounded-pill bg-panel-inset/60`}
        />
      </div>
      <div className="flex items-center justify-between border-t-2 border-panel-inset pt-3">
        <div className="h-3 w-16 rounded-pill bg-panel-inset" />
        <div className="h-6 w-6 rounded-pill bg-panel-inset" />
      </div>
    </div>
  );
}

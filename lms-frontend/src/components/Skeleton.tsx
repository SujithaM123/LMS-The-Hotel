export function SkeletonText({ width = "100%" }: { width?: string | number }) {
  return <div className="skeleton skeleton-text" style={{ width }} />;
}

export function SkeletonKpiRow({ count = 4 }: { count?: number }) {
  return (
    <div className="kpi-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton skeleton-kpi" key={i} />
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton skeleton-card" key={i} />
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton skeleton-row" key={i} />
      ))}
    </div>
  );
}

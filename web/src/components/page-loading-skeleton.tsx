function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

export function PageLoadingSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Bar className="h-5 w-40" />
          <Bar className="h-3.5 w-64" />
        </div>
        <Bar className="h-8 w-32 rounded-lg" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border p-4">
            <Bar className="h-3 w-24" />
            <Bar className="h-6 w-20" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-4">
        <Bar className="h-8 w-full max-w-sm rounded-lg" />
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border p-4">
        <Bar className="h-4 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Bar key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}

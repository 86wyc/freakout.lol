export default function AppLoading() {
  return (
    <div className="w-full max-w-5xl animate-pulse" aria-hidden="true">
      <div className="mb-8 h-7 w-40 rounded-md bg-content2" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-lg border border-divider bg-content1" />
        <div className="h-28 rounded-lg border border-divider bg-content1" />
        <div className="h-28 rounded-lg border border-divider bg-content1" />
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-12 rounded-lg border border-divider bg-content1" />
        <div className="h-12 rounded-lg border border-divider bg-content1" />
        <div className="h-12 rounded-lg border border-divider bg-content1" />
      </div>
    </div>
  );
}

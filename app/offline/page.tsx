export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">You are offline</h1>
        <p className="mt-2 text-sm text-slate-600">
          The app is running without internet. Reconnect to sync fresh data from Supabase.
        </p>
      </div>
    </main>
  )
}

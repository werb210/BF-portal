export default function FatalErrorScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Fatal Error</h1>
        <p className="mt-3 text-sm text-slate-300">
          The portal encountered an unrecoverable error. Please refresh the page or contact an administrator.
        </p>
      </div>
    </div>
  );
}

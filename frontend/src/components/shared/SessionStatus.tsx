export function SessionStatus({ status }: { status: string }) {
  return <span className="rounded-full bg-brand-700/10 px-3 py-1 text-sm font-medium text-brand-700">{status}</span>;
}

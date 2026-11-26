import { LoaderCircle } from 'lucide-react'

export function Loading({ label }: { label?: string }) {
  return (
    <div className="grid h-full place-items-center gap-3 p-6 text-center" role="status" aria-live="polite">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  )
}

export function SergetLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm bg-accent" aria-hidden />
        <span className="text-2xl font-semibold tracking-tight text-primary">SERGET</span>
      </div>
      <span className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Mobilidade Viária
      </span>
    </div>
  );
}
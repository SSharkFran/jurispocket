interface FullScreenLoaderProps {
  label?: string;
}

export function FullScreenLoader({ label = 'Carregando...' }: FullScreenLoaderProps) {
  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary/20 border-b-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

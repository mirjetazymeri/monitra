import { Logo } from "@/components/layout/logo";

export function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5" role="status" aria-live="polite">
      <Logo />
      <div className="h-1 w-40 overflow-hidden rounded-full bg-elevated">
        <div className="h-full w-1/3 animate-[loader_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <style>{`@keyframes loader{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}

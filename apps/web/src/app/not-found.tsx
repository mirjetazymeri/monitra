import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 text-center">
      <Logo className="mb-12" />
      <span className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-card text-primary">
        <Compass className="size-6" aria-hidden="true" />
      </span>
      <p className="metric mt-6 text-sm font-semibold tracking-widest text-subtle-foreground uppercase">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">The page you are looking for doesn&apos;t exist or has been moved.</p>
      <Link
        href="/overview"
        className="mt-8 inline-flex h-10 items-center gap-2 rounded-lg bg-primary-solid px-4 text-sm font-medium text-white transition-colors hover:bg-primary-solid/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" />
        Back to overview
      </Link>
    </main>
  );
}

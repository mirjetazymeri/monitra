import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", description, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-destructive/12 text-destructive">
        <AlertCircle className="size-5" />
      </span>
      <div>
        <p className="font-heading text-base font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="lg" onClick={onRetry} className="mt-1">
          <RotateCw />
          Try again
        </Button>
      )}
    </div>
  );
}

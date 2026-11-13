"use client";

import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Endpoint } from "@/lib/api/types";

interface Props {
  endpoint: Endpoint | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (endpoint: Endpoint) => void;
}

export function DeleteEndpointDialog({ endpoint, pending, onCancel, onConfirm }: Props) {
  return (
    <AlertDialog open={endpoint !== null} onOpenChange={(open) => !open && !pending && onCancel()}>
      <AlertDialogContent className="border border-border bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading">Delete {endpoint?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the endpoint together with its entire check history and incidents. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant="danger"
            disabled={pending || !endpoint}
            onClick={() => endpoint && onConfirm(endpoint)}
          >
            {pending && <Loader2 className="animate-spin" />}
            Delete endpoint
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

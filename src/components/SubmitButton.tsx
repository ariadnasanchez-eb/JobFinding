"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./ui";

export function SubmitButton({ children, pendingText, variant }: { children: React.ReactNode; pendingText: string; variant?: "primary" | "secondary" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} variant={variant}>
      {pending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {pending ? pendingText : children}
    </Button>
  );
}

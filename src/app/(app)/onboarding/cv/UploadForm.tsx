"use client";

import { useActionState, useState } from "react";
import { uploadCv, type FormState } from "../../actions";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function UploadForm() {
  const [state, action] = useActionState<FormState, FormData>(uploadCv, {});
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <form action={action} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-canvas px-6 py-12 text-center hover:border-accent/50">
        <span className="text-sm font-medium text-ink">{fileName ?? "Choose your CV"}</span>
        <span className="mt-1 text-xs text-muted">PDF or DOCX, up to 5 MB</span>
        <input
          type="file"
          name="cv"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>
      <SubmitButton pendingText="Reading your CV… this can take up to a minute">Upload and analyze</SubmitButton>
    </form>
  );
}

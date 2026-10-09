import { Card } from "@/components/ui";
import { OnboardingSteps } from "@/components/OnboardingSteps";
import { UploadForm } from "./UploadForm";

export const metadata = { title: "Upload your CV · AI Career Coach" };

export default function UploadCvPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <OnboardingSteps current={0} />
      <h1 className="text-2xl font-semibold tracking-tight">Upload your CV</h1>
      <p className="mt-2 text-muted">
        We extract your roles, skills, seniority and measurable achievements. You&apos;ll review everything before it is used.
      </p>
      <Card className="mt-6">
        <UploadForm />
      </Card>
      <p className="mt-4 text-xs text-muted">
        Email addresses, phone numbers and LinkedIn links are removed before the text is sent to the AI. You can delete your CV at
        any time from Settings.
      </p>
    </div>
  );
}

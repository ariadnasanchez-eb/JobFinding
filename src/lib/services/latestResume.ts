import { db } from "@/lib/db";
import { parsedResumeSchema, type ParsedResume } from "@/lib/ai/schemas";

export async function latestResume(userId: string): Promise<{ id: string; fileName: string; parsed: ParsedResume | null; aiProvider: string | null } | null> {
  const r = await db.resume.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, parsedProfile: true, aiProvider: true },
  });
  if (!r) return null;
  const parsed = parsedResumeSchema.safeParse(r.parsedProfile);
  return { id: r.id, fileName: r.fileName, parsed: parsed.success ? parsed.data : null, aiProvider: r.aiProvider };
}

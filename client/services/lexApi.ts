import type { AnalysisResult } from "@/types/lex";

export async function tokenize(lexSpecification: string, source: string) {
  const response = await fetch("/api/tokenize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lexSpecification, source }),
  });

  if (!response.ok) throw new Error("Analysis request failed");

  return response.json() as Promise<AnalysisResult>;
}

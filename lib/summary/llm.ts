import OpenAI from "openai";
import { AISummary } from "../types";

export async function refineSummary(
  baseSummary: AISummary,
  meta: { owner: string; name: string; description: string | null }
): Promise<AISummary> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return baseSummary;
  }

  try {
    const openai = new OpenAI({ apiKey });

    const prompt = `You are a technical writer analyzing a GitHub repository. Refine and enhance the following analysis for the repository "${meta.owner}/${meta.name}".

Repository description: ${meta.description || "No description provided"}

Current introduction:
${baseSummary.introduction}

Current architecture analysis:
${baseSummary.architecture}

Current technical analysis:
${baseSummary.technicalAnalysis}

Please refine each section to be more insightful, professional, and actionable. Keep the same structure but improve clarity, add context where helpful, and make the language more engaging. Return your response as a JSON object with keys: "introduction", "architecture", "technicalAnalysis".`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return baseSummary;

    const refined = JSON.parse(content) as AISummary;
    return {
      introduction: refined.introduction || baseSummary.introduction,
      architecture: refined.architecture || baseSummary.architecture,
      technicalAnalysis: refined.technicalAnalysis || baseSummary.technicalAnalysis,
    };
  } catch {
    return baseSummary;
  }
}

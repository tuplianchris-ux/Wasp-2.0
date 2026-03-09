import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { question, rubric, studentAnswer, maxPoints = 10 } = body;

  if (process.env.MOCK_MODE === "true") {
    return NextResponse.json({
      score: Math.round((maxPoints ?? 10) * 0.8),
      feedback: "Mock AI feedback: good effort. Set MOCK_MODE=false and add ANTHROPIC_API_KEY for real grading.",
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { score: 0, feedback: "AI grading unavailable — ANTHROPIC_API_KEY not set." },
      { status: 200 }
    );
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Grade this short answer question. Be fair but rigorous.

Question: ${question}
Rubric / Criteria: ${rubric ?? "General correctness and completeness"}
Student Answer: ${studentAnswer}
Max Points: ${maxPoints}

Return ONLY valid JSON in this exact format (no other text):
{"score": <number 0 to ${maxPoints}>, "feedback": "<constructive feedback string>"}`,
        },
      ],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json(result);
  } catch (err) {
    console.error("AI grading error:", err);
    return NextResponse.json({ score: 0, feedback: "AI grading failed. Please grade manually." });
  }
}

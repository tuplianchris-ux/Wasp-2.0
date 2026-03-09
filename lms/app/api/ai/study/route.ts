import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { topic, gradeLevel, goal } = body;

  if (process.env.MOCK_MODE === "true") {
    return NextResponse.json({
      studyGuide: `# Mock Study Guide: ${topic ?? "Topic"}\n\nThis is mock content. Set MOCK_MODE=false and add ANTHROPIC_API_KEY for real AI.\n\n- Key point 1\n- Key point 2\n- Summary`,
      flashcards: [
        { q: `What is ${topic ?? "this topic"}?`, a: "Mock answer." },
        { q: "Another question?", a: "Mock answer 2." },
      ],
      practiceQuestions: [
        { question: "Sample question?", answer: "Sample answer.", explanation: "Mock explanation." },
      ],
      summary: "Mock study package summary. Enable real API for full content.",
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are an expert tutor. Generate a complete study package for:
Topic: ${topic}
Grade Level: ${gradeLevel}
Learning Goal: ${goal}

Return ONLY valid JSON in this exact format (no other text, no markdown fences):
{
  "studyGuide": "<markdown string with headers, lists, and explanations>",
  "flashcards": [{"q": "<question>", "a": "<answer>"}],
  "practiceQuestions": [{"question": "<question>", "answer": "<answer>", "explanation": "<why>"}],
  "summary": "<2-3 paragraph concise summary>"
}

Make flashcards array have at least 8 items. Make practiceQuestions have at least 5 items.`,
        },
      ],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Study AI error:", err);
    return NextResponse.json({ error: "Failed to generate study content" }, { status: 500 });
  }
}

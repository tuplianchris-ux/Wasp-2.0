import { HttpError } from "wasp/server";
import type { GetAiStudyGuide, GradeWithAi } from "wasp/server/operations";
import { callClaude } from "../lib/anthropic";

type StudyGuideInput = {
  topic: string;
  gradeLevel?: string;
  goal?: string;
};

type StudyGuideOutput = {
  studyGuide: string;
  flashcards: { q: string; a: string }[];
  practiceQuestions: { question: string; answer: string; explanation: string }[];
  summary: string;
};

type GradeWithAiInput = {
  question: string;
  rubric?: string;
  studentAnswer: string;
  maxPoints?: number;
};

type GradeWithAiOutput = {
  score: number;
  feedback: string;
};

export const getAiStudyGuide: GetAiStudyGuide<
  StudyGuideInput,
  StudyGuideOutput
> = async ({ topic, gradeLevel, goal }, context) => {
  if (!context.user) throw new HttpError(401, "Unauthorized");

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      studyGuide: `# Study Guide: ${topic}\n\nAI study guides are unavailable — set ANTHROPIC_API_KEY to enable.\n\n- Key point 1\n- Key point 2\n- Summary`,
      flashcards: [
        { q: `What is ${topic}?`, a: "Set ANTHROPIC_API_KEY for AI-generated answers." },
      ],
      practiceQuestions: [
        {
          question: `Describe ${topic} in your own words.`,
          answer: "AI answer unavailable.",
          explanation: "Set ANTHROPIC_API_KEY to enable AI grading.",
        },
      ],
      summary: `Configure ANTHROPIC_API_KEY for full AI-powered study packages on "${topic}".`,
    };
  }

  try {
    const prompt = `Create a comprehensive study package for the topic: "${topic}".
${gradeLevel ? `Grade level: ${gradeLevel}` : ""}
${goal ? `Learning goal: ${goal}` : ""}

Return a JSON object with this exact structure:
{
  "studyGuide": "markdown string with the full study guide",
  "flashcards": [{"q": "question", "a": "answer"}],
  "practiceQuestions": [{"question": "...", "answer": "...", "explanation": "..."}],
  "summary": "brief summary paragraph"
}

Return only valid JSON, no other text.`;

    const jsonStr = await callClaude(prompt, 4096);
    return JSON.parse(jsonStr) as StudyGuideOutput;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new HttpError(500, `AI study guide generation failed: ${msg}`);
  }
};

export const gradeWithAi: GradeWithAi<
  GradeWithAiInput,
  GradeWithAiOutput
> = async ({ question, rubric, studentAnswer, maxPoints = 10 }, context) => {
  if (!context.user) throw new HttpError(401, "Unauthorized");

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      score: 0,
      feedback: "AI grading unavailable — ANTHROPIC_API_KEY not set.",
    };
  }

  try {
    const prompt = `Grade this short answer question. Be fair but rigorous.

Question: ${question}
Rubric / Criteria: ${rubric ?? "General correctness and completeness"}
Student Answer: ${studentAnswer}
Max Points: ${maxPoints}

Return a JSON object with this exact structure:
{"score": <number 0 to ${maxPoints}>, "feedback": "<constructive feedback string>"}

Return only valid JSON.`;

    const jsonStr = await callClaude(prompt, 500);
    return JSON.parse(jsonStr) as GradeWithAiOutput;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new HttpError(500, `AI grading failed: ${msg}`);
  }
};

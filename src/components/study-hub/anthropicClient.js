/**
 * Anthropic Messages API client for Study Hub.
 * Builds system prompts and sends requests; parses JSON for quiz/flashcards.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

const AGENT_LABELS = {
  deep: "Deep Analysis",
  quick: "Quick Summary",
  study: "Study Notes",
};

/**
 * Build system prompt string from active tab and options.
 * @param {string} activeTab - "summarize" | "quiz" | "flashcards"
 * @param {object} options - tab-specific options
 */
export function buildSystemPrompt(activeTab, options = {}) {
  const agent = AGENT_LABELS[options.agent] || AGENT_LABELS.deep;

  if (activeTab === "summarize") {
    const style = options.summaryStyle || "Concise";
    const length = options.summaryLength || "Medium";
    return `You are a study assistant. Generate a ${style} summary in ${length} length using a ${agent} approach. Return clean markdown only: use headers, bullets, and bold for key terms. Do not include a title or preamble.`;
  }

  if (activeTab === "quiz") {
    const count = options.numQuestions ?? 5;
    const questionTypeMap = { multiple_choice: "Multiple Choice", true_false: "True or False", short_answer: "Short Answer", mixed: "Mixed" };
    const questionType = questionTypeMap[options.questionType] || "Multiple Choice";
    const difficulty = options.difficulty || "Medium";
    return `You are a study assistant. Generate exactly ${count} ${questionType} questions at ${difficulty} difficulty based on the given content. Return a valid JSON array only, no markdown or explanation. Each item must have: "question" (string), "options" (array of strings, for multiple choice/true-false), "answer" (string, the correct answer text or index as string e.g. "0"), "explanation" (string, optional). For multiple choice use "options" with 4 options; for true/false use "options": ["True", "False"]. Use "answer" as the exact correct option text (e.g. "True" or the full answer text).`;
  }

  if (activeTab === "flashcards") {
    const count = options.numCards ?? 10;
    const cardStyleMap = { term_def: "Term → Definition", question_answer: "Question → Answer", cloze: "Cloze (fill-in-the-blank)" };
    const cardStyle = cardStyleMap[options.cardStyle] || "Term → Definition";
    return `You are a study assistant. Generate exactly ${count} flashcards in "${cardStyle}" format based on the given content. Return a valid JSON array only, no markdown or explanation. Each item must have: "front" (string), "back" (string). For Cloze (fill-in-the-blank), put the sentence with _____ for the blank in "front" and the missing word/phrase in "back".`;
  }

  return "You are a helpful study assistant.";
}

/**
 * Build user message content: text block + optional image blocks.
 * @param {string} textContent - main text (paste + file text + link note)
 * @param {Array<{type: string, name?: string, data?: string, text?: string}>} attachments - from state
 */
function buildUserContent(textContent, attachments = []) {
  const blocks = [];

  const hasText = textContent && textContent.trim().length > 0;
  let combinedText = "";

  if (hasText) combinedText += textContent.trim();

  const linkNote = attachments
    .filter((a) => a.type === "link" && a.url)
    .map((a) => `URL (for context; you cannot fetch live): ${a.url}`)
    .join("\n");
  if (linkNote) combinedText += (combinedText ? "\n\n" : "") + linkNote;

  if (combinedText) {
    blocks.push({ type: "text", text: combinedText });
  }

  attachments
    .filter((a) => a.type === "image" && a.data)
    .forEach((a) => {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: a.mediaType || "image/png",
          data: a.data,
        },
      });
    });

  if (blocks.length === 0) {
    blocks.push({ type: "text", text: "(No content provided.)" });
  }

  return blocks;
}

/**
 * Call Anthropic Messages API.
 * @param {string} activeTab - "summarize" | "quiz" | "flashcards"
 * @param {object} options - tab-specific options (agent, summaryStyle, numQuestions, etc.)
 * @param {string} textContent - main content
 * @param {Array} attachments - [{ type, url?, data?, mediaType?, name?, text? }]
 * @returns {Promise<{ type: string, data: any, raw?: string }>} - { type, data } with parsed data or error
 */
export async function callAnthropic(activeTab, options, textContent, attachments = []) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("REACT_APP_ANTHROPIC_API_KEY is not set.");
  }

  const system = buildSystemPrompt(activeTab, options);
  const userContent = buildUserContent(textContent, attachments);

  const body = {
    model: options.model || DEFAULT_MODEL,
    max_tokens: options.max_tokens ?? 4096,
    system,
    messages: [{ role: "user", content: userContent }],
  };

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    let message = `API error ${response.status}`;
    try {
      const j = JSON.parse(errText);
      message = j.error?.message || errText || message;
    } catch (_) {
      message = errText || message;
    }
    throw new Error(message);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b) => b.type === "text");
  const raw = textBlock?.text?.trim() || "";

  if (activeTab === "summarize") {
    return { type: "summary", data: raw, raw };
  }

  if (activeTab === "quiz") {
    const parsed = parseJsonArray(raw);
    const questions = normalizeQuizItems(parsed);
    return { type: "quiz", data: questions, raw };
  }

  if (activeTab === "flashcards") {
    const parsed = parseJsonArray(raw);
    const cards = Array.isArray(parsed)
      ? parsed.map((item) => ({
          front: item.front ?? item.term ?? "",
          back: item.back ?? item.definition ?? "",
        }))
      : [];
    return { type: "flashcards", data: cards, raw };
  }

  return { type: "summary", data: raw, raw };
}

function parseJsonArray(raw) {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try {
    return JSON.parse(stripped);
  } catch (_) {
    return null;
  }
}

function normalizeQuizItems(parsed) {
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => {
    const options = item.options || [];
    const answer = item.answer ?? item.correct_answer;
    let correctIndex = 0;
    if (typeof answer === "number") correctIndex = answer;
    else if (typeof answer === "string") {
      const idx = options.findIndex((o) => String(o).trim() === String(answer).trim());
      correctIndex = idx >= 0 ? idx : 0;
    }
    return {
      question: item.question || "",
      options,
      correct_answer: correctIndex,
      answer: options[correctIndex],
      explanation: item.explanation,
    };
  });
}

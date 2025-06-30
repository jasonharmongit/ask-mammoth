import { readFile } from "fs/promises";
import OpenAI from "openai";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Optionally, cache these in a DB for reuse
let assistantId: string | null = null;
let cachedInstructions: string | null = null;

async function getInstructions() {
  if (cachedInstructions) return cachedInstructions;
  const promptPath = path.join(__dirname, "oracle-prompt.md");
  cachedInstructions = await readFile(promptPath, "utf-8");
  return cachedInstructions;
}

async function getOrCreateAssistant() {
  if (assistantId) return assistantId;
  const instructions = await getInstructions();
  const assistant = await openai.beta.assistants.create({
    name: "AskMammoth Oracle",
    instructions,
    tools: [{ type: "code_interpreter" }],
    model: "gpt-4o",
  });
  assistantId = assistant.id;
  return assistantId;
}

/**
 * Streams an assistant response for a given user message.
 * @param userMessage The user's message (string)
 * @param onDelta Callback for each streamed delta (text chunk or tool event)
 * @param options Optionally pass threadId to continue a conversation
 */
export async function streamAssistantResponse({
  userMessage,
  onDelta,
  threadId,
}: {
  userMessage: string;
  onDelta: (delta: { type: string; value: any }) => void;
  threadId: string;
}) {
  const assistant_id = await getOrCreateAssistant();
  // Create or reuse thread
  const thread = threadId ? { id: threadId } : await openai.beta.threads.create();

  // Add user message
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: userMessage,
  });

  // Stream the run
  const stream = openai.beta.threads.runs.stream(thread.id, {
    assistant_id,
  });

  for await (const event of stream) {
    // event can be text delta, tool call, etc.
    if (event.event === "thread.message.delta") {
      const delta = event.data.delta;
      if (delta.content && Array.isArray(delta.content)) {
        for (const c of delta.content) {
          if (c.type === "text" && c.text?.value) {
            onDelta({ type: "text", value: c.text.value });
          }
        }
      }
    } else if (event.event.startsWith("thread.run.")) {
      onDelta({ type: event.event, value: event.data });
    }
    // Add more event types as needed
  }

  return { threadId: thread.id };
}

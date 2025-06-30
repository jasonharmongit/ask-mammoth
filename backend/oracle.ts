import { Storage } from "@google-cloud/storage";
import { readFile } from "fs/promises";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google Cloud Storage setup
const storage = new Storage();
const BUCKET_NAME = "ask-mammoth-bucket";

// Optionally, cache these in a DB for reuse
let assistantId: string | null = null;
let cachedInstructions: string | null = null;

async function getInstructions() {
  if (cachedInstructions) return cachedInstructions;
  const promptPath = path.join(__dirname, "oracle-prompt.md");
  cachedInstructions = await readFile(promptPath, "utf-8");
  return cachedInstructions;
}

// Tool: fetchCandidateProfile
async function fetchCandidateProfile({ firstName }: { firstName: string }) {
  const safeName = firstName.toLowerCase();
  const fileName = `${safeName}.md`;
  const file = storage.bucket(BUCKET_NAME).file(fileName);
  try {
    const [contents] = await file.download();
    return contents.toString("utf-8");
  } catch (err) {
    return `Profile for ${firstName} not found.`;
  }
}

async function getOrCreateAssistant() {
  try {
    if (assistantId) return assistantId;
    const instructions = await getInstructions();
    const assistant = await openai.beta.assistants.create({
      name: "AskMammoth Oracle",
      instructions,
      tools: [
        { type: "code_interpreter" },
        {
          type: "function",
          function: {
            name: "fetchCandidateProfile",
            description: "Fetches the markdown profile for a candidate by first name from Google Cloud Storage.",
            parameters: {
              type: "object",
              properties: {
                firstName: { type: "string", description: "The candidate's first name." },
              },
              required: ["firstName"],
            },
          },
        },
      ],
      model: "gpt-4.1-nano-2025-04-14",
    });
    assistantId = assistant.id;
    return assistantId;
  } catch (error) {
    console.error("Error getting or creating assistant", error);
    throw error;
  }
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
  threadId?: string;
}): Promise<{ threadId: string }> {
  console.log("Streaming assistant response", userMessage);
  const assistant_id = await getOrCreateAssistant();
  console.log("Assistant ID", assistant_id);
  // Create or reuse thread
  let thread;
  if (threadId) {
    thread = { id: threadId };
  } else {
    thread = await openai.beta.threads.create();
  }

  // Add user message
  console.log("Adding user message", userMessage);
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: userMessage,
  });

  // Stream the run
  console.log("Streaming run", thread.id, assistant_id);
  let run = openai.beta.threads.runs.stream(thread.id, {
    assistant_id,
  });

  // Helper to process tool calls
  async function handleToolCall(toolCall: any) {
    if (toolCall.function.name === "fetchCandidateProfile") {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await fetchCandidateProfile(args);
      return {
        tool_call_id: toolCall.id,
        output: result,
      };
    }
    // Add more tools here as needed
    return {
      tool_call_id: toolCall.id,
      output: "Tool not implemented.",
    };
  }

  // Streaming and tool call handling loop
  let continueStreaming = true;
  while (continueStreaming) {
    for await (const event of run) {
      if (event.event === "thread.message.delta") {
        const delta = event.data.delta;
        if (delta.content && Array.isArray(delta.content)) {
          for (const c of delta.content) {
            if (c.type === "text" && c.text?.value) {
              onDelta({ type: "chunk", value: c.text.value });
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          }
        }
      } else if (event.event === "thread.run.requires_action") {
        // Tool call required
        if (event.data.required_action && event.data.required_action.submit_tool_outputs) {
          const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
          console.log("Tool calls", toolCalls);
          const toolOutputs: any[] = [];
          for (const toolCall of toolCalls as any[]) {
            toolOutputs.push(await handleToolCall(toolCall));
          }
          console.log("Tool Outputs", toolOutputs);
          // Submit tool outputs (run.id, not thread.id), add thread_id
          await openai.beta.threads.runs.submitToolOutputs(event.data.id, {
            tool_outputs: toolOutputs,
            thread_id: thread.id,
          });
          // console.log("Starting new stream");
          // // Always start a new stream after submitting tool outputs
          // run = openai.beta.threads.runs.stream(thread.id, { assistant_id });
          // break; // Exit the for-await loop to start the new stream
        }
      } else if (event.event.startsWith("thread.run.")) {
        onDelta({ type: event.event, value: event.data });
      }
      // Add more event types as needed
    }
    // If we reach here without a tool call, end the loop
    if (continueStreaming) continueStreaming = false;
  }

  return { threadId: thread.id };
}

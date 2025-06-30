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

// Conversation history is managed in memory per session/request
export type Turn = {
  role: "user" | "assistant";
  content: string;
};

export async function streamAssistantResponse({
  userMessage,
  onDelta,
  history = [],
}: {
  userMessage: string;
  onDelta: (delta: { type: string; value: any }) => void;
  history?: Turn[];
}): Promise<void> {
  // Prepare the conversation context
  const instructions = await getInstructions();
  const messages: any[] = [
    { role: "system", content: instructions },
    ...history,
    { role: "user", content: userMessage },
  ];

  // Define the tool for the chat API (using new tools interface)
  const tools = [
    {
      type: "function" as const,
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
  ];

  // Helper to handle tool calls
  async function handleToolCall(toolCall: any) {
    if (toolCall.function && toolCall.function.name === "fetchCandidateProfile") {
      const args = toolCall.function.arguments;
      const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
      const result = await fetchCandidateProfile(parsedArgs);
      return {
        role: "tool",
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: result,
      };
    }
    return {
      role: "tool",
      tool_call_id: toolCall.id,
      name: toolCall.function?.name || "unknown",
      content: "Tool not implemented.",
    };
  }

  // Main loop: handle tool calls if present
  let toolCalls = null;
  let toolCallDetected = false;
  let currentMessages = messages;

  do {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: currentMessages,
      tools,
      tool_choice: "auto",
      stream: true,
    });

    toolCalls = [];
    toolCallDetected = false;
    let toolCallsMap: Record<string, any> = {};

    for await (const chunk of response) {
      console.log("[oracle] raw chunk:", JSON.stringify(chunk, null, 2));
      const choice = chunk.choices[0];
      if (choice.delta && choice.delta.tool_calls) {
        toolCallDetected = true;
        // Accumulate tool calls (array)
        for (const toolCall of choice.delta.tool_calls) {
          if (toolCall.id && toolCall.function) {
            if (!toolCallsMap[toolCall.id]) {
              toolCallsMap[toolCall.id] = { ...toolCall, function: { ...toolCall.function, arguments: "" } };
            }
            if (toolCall.function.arguments) {
              toolCallsMap[toolCall.id].function.arguments += toolCall.function.arguments;
            }
          }
        }
      } else if (choice.delta && choice.delta.content) {
        onDelta({ type: "chunk", value: choice.delta.content });
        console.log("[oracle] content:", choice.delta.content);
      } else {
        console.log("[oracle] no delta");
      }
    }

    // Convert toolCallsMap to array
    toolCalls = Object.values(toolCallsMap);

    if (toolCallDetected && toolCalls.length > 0) {
      // Handle each tool call and loop again with the tool result(s)
      const toolMessages = [];
      for (const toolCall of toolCalls) {
        const toolMessage = await handleToolCall(toolCall);
        toolMessages.push({
          role: "assistant",
          content: "",
          tool_calls: [toolCall],
        });
        toolMessages.push(toolMessage);
      }
      currentMessages = [...currentMessages, ...toolMessages];
    } else {
      // No tool call, finish
      toolCallDetected = false;
    }
  } while (toolCallDetected);
}

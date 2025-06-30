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
  if (safeName === "jason") {
    return "You already know about Jason's profile.";
  }
  const fileName = `${safeName}.md`;
  const file = storage.bucket(BUCKET_NAME).file(fileName);
  try {
    const [contents] = await file.download();
    // console.log("[oracle] fetched profile for", firstName, "->", contents.toString("utf-8"));
    return contents.toString("utf-8");
  } catch (err) {
    console.error("[oracle] error fetching profile for", firstName, err);
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

  // Main loop: handle tool calls if present
  let currentMessages = messages;
  while (true) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: currentMessages,
      tools,
      tool_choice: "auto",
      stream: true,
    });

    // Accumulate tool call arguments as they stream in, using only index
    let toolCallsMap: Record<number, any> = {}; // index -> tool call accumulator
    let toolCallDetected = false;
    let finishReason: string | null = null;
    let gotContent = false;

    for await (const chunk of response) {
      // console.log("[oracle] chunk:", chunk);
      const choice = chunk.choices[0];
      // console.log("[oracle] delta:", JSON.stringify(choice.delta, null, 2));
      if (choice.delta && choice.delta.tool_calls) {
        // console.log("[oracle] tool_calls detected");
        toolCallDetected = true;
        for (const toolCall of choice.delta.tool_calls) {
          const idx = toolCall.index;
          if (!toolCallsMap[idx]) {
            // First chunk for this tool call: initialize
            toolCallsMap[idx] = {
              ...toolCall,
              function: {
                ...toolCall.function,
                arguments: "",
              },
            };
          }
          // console.log("new toolcallmap", toolCallsMap);
          if (toolCall.function && toolCall.function.arguments) {
            toolCallsMap[idx].function.arguments += toolCall.function.arguments;
            // console.log("[oracle] accumulating for index", idx, ":", toolCallsMap[idx].function.arguments);
          }
        }
      } else if (choice.delta && choice.delta.content) {
        gotContent = true;
        onDelta({ type: "chunk", value: choice.delta.content });
        // console.log("[oracle] content:", choice.delta.content);
      } else {
        // console.log("[oracle] no delta");
      }
      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }
    }

    // If we got content, we're done (no tool call needed)
    if (gotContent) {
      break;
    }

    // If we have tool calls to process, do so
    const toolCalls = Object.values(toolCallsMap);
    if ((toolCallDetected && toolCalls.length > 0) || finishReason === "tool_calls") {
      // console.log("[oracle] toolCalls:", toolCalls);
      // console.log("[oracle] toolCalls detected");
      const toolMessages = [];
      for (const toolCall of toolCalls) {
        let parsedArgs: any = {};
        try {
          // console.log("[oracle] final arguments for index", toolCall.index, ":", toolCall.function.arguments);
          parsedArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
        } catch (e) {
          console.error("[oracle] Failed to parse tool call arguments:", toolCall.function.arguments, e);
        }
        // Actually call the tool
        let toolResult: string;
        if (toolCall.function.name === "fetchCandidateProfile") {
          // console.log("[oracle] fetching profile for", parsedArgs.firstName);
          toolResult = await fetchCandidateProfile(parsedArgs);
        } else {
          toolResult = "Tool not implemented.";
        }
        // console.log(`[oracle] Tool '${toolCall.function.name}' called with`, parsedArgs, "->", toolResult);
        // Send the tool result back to OpenAI as a tool message
        toolMessages.push({
          role: "tool",
          tool_call_id: toolCall.id, // still send id back to OpenAI
          content: toolResult,
        });
      }
      // Add the tool call(s) and their result(s) to the message history
      currentMessages = [
        ...currentMessages,
        // The assistant turn that triggered the tool call(s)
        {
          role: "assistant",
          content: "",
          tool_calls: toolCalls,
        },
        // The tool result(s)
        ...toolMessages,
      ];
      // Continue the loop to get the assistant's final response
      continue;
    } else {
      // No tool call, no content, nothing to do
      break;
    }
  }
}

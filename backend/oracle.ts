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
}): Promise<{ history: Turn[] }> {
  // Prepare the conversation context
  const instructions = await getInstructions();
  const messages: any[] = [
    { role: "system", content: instructions },
    ...history,
    { role: "user", content: userMessage },
  ];

  // Define the function for the chat API
  const functions = [
    {
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
  ];

  // Helper to handle function calls
  async function handleFunctionCall(functionCall: any) {
    if (functionCall.name === "fetchCandidateProfile") {
      const args = functionCall.arguments;
      const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
      const result = await fetchCandidateProfile(parsedArgs);
      return {
        role: "function",
        name: functionCall.name,
        content: result,
      };
    }
    return {
      role: "function",
      name: functionCall.name,
      content: "Tool not implemented.",
    };
  }

  // Main loop: handle function calls if present
  let assistantContent = "";
  let functionCall = null;
  let functionCallDetected = false;
  let currentMessages = messages;

  do {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: currentMessages,
      functions,
      function_call: "auto",
      stream: true,
    });

    assistantContent = "";
    functionCall = null;
    for await (const chunk of response) {
      const choice = chunk.choices[0];
      if (choice.finish_reason === "function_call" && choice.delta.function_call) {
        functionCallDetected = true;
        functionCall = choice.delta.function_call;
      } else if (choice.delta && choice.delta.content) {
        assistantContent += choice.delta.content;
        onDelta({ type: "chunk", value: choice.delta.content });
      }
    }

    if (functionCall) {
      // Handle the function call and loop again with the function result
      const functionMessage = await handleFunctionCall(functionCall);
      currentMessages = [
        ...currentMessages,
        {
          role: "assistant",
          content: "",
          function_call: functionCall,
        },
        functionMessage,
      ];
    } else {
      // No function call, finish
      functionCallDetected = false;
      // Add the assistant's response to the history
      history = [...history, { role: "user", content: userMessage }, { role: "assistant", content: assistantContent }];
    }
  } while (functionCallDetected);

  return { history };
}

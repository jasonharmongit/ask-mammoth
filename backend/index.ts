import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import fs from "fs";
import type { IncomingMessage } from "http";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocket, WebSocketServer } from "ws";
import { streamAssistantResponse } from "./oracle.ts";

const app = express();
const port = 3000;
const server = createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oraclePath = path.join(__dirname, "oracle.ts");

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

// Write Google service account JSON from environment variable (if present)
if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
  fs.writeFileSync(
    "/tmp/service-account.json",
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8")
  );
  process.env.GOOGLE_APPLICATION_CREDENTIALS = "/tmp/service-account.json";
}

// Authentication endpoint
app.post("/api/authenticate", (req: Request, res: Response) => {
  const { accessToken } = req.body;
  if (accessToken === ACCESS_TOKEN) {
    const sessionToken = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: "1h" });
    res.cookie("sessionToken", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
      path: "/",
    });
    res.sendStatus(200);
  } else {
    res.sendStatus(401);
  }
});

// Add GET /api/authenticate for auth check
app.get("/api/authenticate", requireAuth, (req: Request, res: Response) => {
  res.sendStatus(200);
});

// Middleware to protect routes
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.sessionToken;
  if (!token) {
    res.sendStatus(401);
    return;
  }
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
}

// --- WebSocket setup for assistant streaming ---
const wss = new WebSocketServer({ server, path: "/ws/assistant" });

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  ws.on("message", async (data: Buffer) => {
    // console.log("message received:", data.toString());
    try {
      // Expecting JSON: { history: Turn[] }
      const { history } = JSON.parse(data.toString());
      if (!history || history.length === 0) throw new Error("No history provided");
      const userTurn = history[history.length - 1];
      const context = history.slice(0, -1);
      if (userTurn.role !== "user") throw new Error("Last turn must be a user message");
      const result = await streamAssistantResponse({
        userMessage: userTurn.content,
        history: context,
        onDelta: (delta) => {
          ws.send(JSON.stringify(delta));
        },
      });
      ws.send(JSON.stringify({ type: "done" }));
    } catch (err: any) {
      ws.send(JSON.stringify({ type: "error", error: err.message }));
    }
  });
});

server.listen(port, () => {
  // console.log(`Server running at http://localhost:${port}`);
});

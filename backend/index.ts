import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import type { IncomingMessage } from "http";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocket, WebSocketServer } from "ws";
import { streamAssistantResponse } from "./oracle.js";

const app = express();
const port = 3000;
const server = createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oraclePath = path.join(__dirname, "oracle.ts");

app.use(express.json());
app.use(cookieParser());

const allowedOriginPattern = /^https:\/\/ask-mammoth.*\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === "http://localhost:5173" || allowedOriginPattern.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

// Authentication endpoint
app.post("/api/authenticate", (req: Request, res: Response) => {
  const { accessToken } = req.body;
  if (accessToken === ACCESS_TOKEN) {
    const sessionToken = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: "1h" });
    res.cookie("sessionToken", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 3600000 * 24 * 3,
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

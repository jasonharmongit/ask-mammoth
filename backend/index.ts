import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import OpenAI from "openai";

const app = express();
const port = 3000;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

app.post("/api/assistant", requireAuth, async (req: Request, res: Response) => {
  const { messages } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano-2025-04-14",
      messages,
    });
    res.json(completion);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

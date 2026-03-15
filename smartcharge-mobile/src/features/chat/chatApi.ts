import { api, unwrap } from "../../lib/api";

export type ChatRecommendation = {
  id: number;
  name: string;
  hour: string;     // "20:00"
  coins: number;
  reason: string;
  isGreen: boolean;
};

export type ChatResponse = {
  role: "bot" | "user";
  content: string;
  recommendations?: ChatRecommendation[];
};

export async function sendMessage(message: string): Promise<ChatResponse> {
  const data = await unwrap<ChatResponse>(api.post("/chat", { message }));
  return data;
}
import { api, unwrap } from "../../lib/api";

export type AuthResponseData = {
  token: string;
  user: { id: number; role: "OPERATOR" | "DRIVER"; name: string; email: string };
};

export function login(email: string, password: string) {
  return unwrap<AuthResponseData>(api.post("/auth/login", { email, password }));
}

export function register(name: string, email: string, password: string) {
  return unwrap<AuthResponseData>(api.post("/auth/register", { name, email, password }));
}
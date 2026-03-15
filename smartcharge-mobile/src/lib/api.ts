import axios from "axios";
import { API_BASE_URL } from "../config";
import { getToken, clearToken } from "./auth";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err?.response?.status === 401) {
      await clearToken();
      // navigation tarafında login'e düşeceğiz (birazdan)
    }
    return Promise.reject(err);
  }
);

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
  meta?: Record<string, unknown>;
};

export async function unwrap<T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const res = await p;
  const json = res.data;
  if (!json.success) throw new Error(json.error?.message || "API hata");
  return json.data;
}
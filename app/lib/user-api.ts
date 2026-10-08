import { apiFetch } from "./api-client";
import type { User } from "../types/user";

export function getCurrentUser(): Promise<User> {
  return apiFetch<User>("/v1/me");
}

import { api } from "@/api/http";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  data: {
    token: string;
    username: string;
    role: string;
  };
}

export async function loginRequest(payload: LoginRequest) {
  return api.post<LoginResponse>("/auth/login", payload);
}

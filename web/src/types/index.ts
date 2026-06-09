export interface ApiEnvelope<T> {
  data: T;
}

export interface UserSummary {
  id: string;
  username: string;
  role: "admin" | "user";
}
import { api } from "@/api/http";

export interface UserInfo {
  username: string;
  role: string;
}

export interface UsersResponse {
  data: UserInfo[];
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role?: string;
}

export interface CreateUserResponse {
  data: UserInfo;
}

export interface DeleteUserResponse {
  data: {
    status: string;
  };
}

export async function fetchUsers() {
  return api.get<UsersResponse>("/users");
}

export async function createUser(data: CreateUserRequest) {
  return api.post<CreateUserResponse>("/users", data);
}

export async function deleteUser(username: string) {
  return api.delete<DeleteUserResponse>(`/users/${username}`);
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  data: {
    status: string;
  };
}

export async function changePassword(username: string, data: ChangePasswordRequest) {
  return api.put<ChangePasswordResponse>(`/users/${username}/password`, data);
}
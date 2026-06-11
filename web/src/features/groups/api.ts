import { api } from "@/api/http";

export interface Group {
  id: number;
  name: string;
  comment: string;
}

export async function fetchGroups() {
  return api.get<{ data: Group[] }>("/groups");
}

export async function createGroup(name: string, comment: string) {
  return api.post<{ data: Group }>("/groups", { name, comment });
}

export async function deleteGroup(id: number) {
  return api.delete(`/groups/${id}`);
}

export async function addMember(groupId: number, username: string) {
  return api.post(`/groups/${groupId}/members`, { username });
}

export async function removeMember(groupId: number, username: string) {
  return api.delete(`/groups/${groupId}/members/${username}`);
}

export async function fetchGroupMembers(groupId: number) {
  return api.get<{ data: string[] }>(`/groups/${groupId}/members`);
}

export async function fetchUserGroups(username: string) {
  return api.get<{ data: Group[] }>(`/users/${username}/groups`);
}
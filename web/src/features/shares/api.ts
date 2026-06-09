import { api } from "@/api/http";

export interface Share {
  id: number;
  name: string;
  path: string;
  protocol: string;
  enabled: boolean;
  readOnly: boolean;
  guest: boolean;
  comment: string;
  createdAt: string;
}

export interface SharesResponse {
  data: Share[];
}

export interface ShareResponse {
  data: Share;
}

export interface SambaStatus {
  installed: boolean;
  running: boolean;
}

export interface SambaStatusResponse {
  data: SambaStatus;
}

export interface CreateShareRequest {
  name: string;
  path: string;
  protocol: string;
  readOnly: boolean;
  guest: boolean;
  comment: string;
}

export async function fetchShares() {
  return api.get<SharesResponse>("/shares");
}

export async function fetchSambaStatus() {
  return api.get<SambaStatusResponse>("/shares/status");
}

export async function createShare(data: CreateShareRequest) {
  return api.post<ShareResponse>("/shares", data);
}

export async function updateShare(id: number, data: CreateShareRequest) {
  return api.put<ShareResponse>(`/shares/${id}`, data);
}

export async function toggleShare(id: number, enabled: boolean) {
  return api.put(`/shares/${id}/toggle`, { enabled });
}

export async function deleteShare(id: number) {
  return api.delete(`/shares/${id}`);
}

export interface ServiceStatus {
  installed: boolean;
  running: boolean;
}

export interface ServiceStatusResponse {
  data: ServiceStatus;
}

export async function fetchWebDAVStatus() {
  return api.get<ServiceStatusResponse>("/shares/status/webdav");
}

export async function fetchNFSStatus() {
  return api.get<ServiceStatusResponse>("/shares/status/nfs");
}

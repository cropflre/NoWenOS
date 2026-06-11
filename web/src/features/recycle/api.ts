import { api } from "@/api/http";

export interface RecycleItem {
  id: number;
  originalPath: string;
  trashPath: string;
  name: string;
  isDir: boolean;
  size: number;
  deletedAt: string;
  deletedBy: string;
}

export interface RecycleListResponse {
  data: RecycleItem[];
}

export async function fetchRecycleItems() {
  return api.get<RecycleListResponse>("/recycle-bin");
}

export async function trashFile(path: string) {
  return api.post("/recycle-bin/trash", { path });
}

export async function restoreItem(id: number) {
  return api.post(`/recycle-bin/${id}/restore`);
}

export async function permanentDelete(id: number) {
  return api.delete(`/recycle-bin/${id}`);
}

export async function emptyTrash() {
  return api.post("/recycle-bin/empty");
}
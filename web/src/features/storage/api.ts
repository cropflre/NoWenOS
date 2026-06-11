import { api } from "@/api/http";

export interface DiskInfo {
  name: string;
  size: string;
  sizeBytes: number;
  used: string;
  usedBytes: number;
  avail: string;
  availBytes: number;
  usedPct: number;
  model: string;
  type: string;
  mountpoint: string;
  fstype: string;
}

export interface DisksResponse {
  data: DiskInfo[];
}

export async function fetchDisks() {
  return api.get<DisksResponse>("/storage/disks");
}
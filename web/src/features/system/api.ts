import { api } from "@/api/http";

export interface SystemInfoResponse {
  data: {
    name: string;
    version: string;
  };
}

export interface SystemStats {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    total: string;
    used: string;
    available: string;
    usage: number;
  };
  disk: {
    total: string;
    used: string;
    free: string;
    usage: number;
  };
  uptime: string;
}

export interface SystemStatsResponse {
  data: SystemStats;
}

export interface NetworkInterface {
  name: string;
  rx: string;
  tx: string;
  rxBps: number;
  txBps: number;
}

export interface NetworkStats {
  interfaces: NetworkInterface[];
  totalRx: string;
  totalTx: string;
}

export interface NetworkStatsResponse {
  data: NetworkStats;
}

export async function fetchSystemInfo() {
  return api.get<SystemInfoResponse>("/system/info");
}

export async function fetchSystemStats() {
  return api.get<SystemStatsResponse>("/system/stats");
}

export async function fetchNetworkStats() {
  return api.get<NetworkStatsResponse>("/system/network");
}

export interface ProcessInfo {
  pid: number;
  name: string;
  user: string;
  cpu: number;
  memory: number;
  state: string;
  command: string;
}

export interface ProcessesResponse {
  data: ProcessInfo[];
}

export async function fetchProcesses(limit?: number) {
  const params = limit ? `?limit=${limit}` : "";
  return api.get<ProcessesResponse>("/system/processes" + params);
}
export interface ThermalZone {
  type: string;
  temp: string;
}

export interface HardwareInfo {
  hostname: string;
  os: string;
  arch: string;
  kernel: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: string;
  boardVendor: string;
  boardName: string;
  biosVendor: string;
  biosVersion: string;
  goVersion: string;
  temperature: ThermalZone[];
}

export interface HardwareResponse {
  data: HardwareInfo;
}

export async function fetchHardware() {
  return api.get<HardwareResponse>("/system/hardware");
}
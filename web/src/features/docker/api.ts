import { api } from "@/api/http";

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
}

export interface ContainersResponse {
  data: ContainerInfo[];
}

export interface ControlResponse {
  data: {
    status: string;
    action: string;
  };
}

export interface LogsResponse {
  data: {
    logs: string;
  };
}

export interface ImageInfo {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
}

export interface ImagesResponse {
  data: ImageInfo[];
}

export interface PullImageResponse {
  data: {
    status: string;
    image: string;
  };
}

export interface RemoveImageResponse {
  data: {
    status: string;
  };
}

export async function fetchContainers() {
  return api.get<ContainersResponse>("/docker/containers");
}

export async function controlContainer(id: string, action: "start" | "stop" | "restart") {
  return api.post<ControlResponse>(`/docker/containers/${id}/control`, { action });
}

export async function fetchContainerLogs(id: string, tail?: number) {
  const params = tail ? `?tail=${tail}` : "";
  return api.get<LogsResponse>(`/docker/containers/${id}/logs${params}`);
}

export async function fetchImages() {
  return api.get<ImagesResponse>("/docker/images");
}

export async function pullImage(image: string) {
  return api.post<PullImageResponse>("/docker/images/pull", { image });
}

export async function removeImage(id: string) {
  return api.delete<RemoveImageResponse>(`/docker/images/${id}`);
}

// ── Docker Compose ──

export interface ComposeProject {
  name: string;
  status: string;
  configFile: string;
  services: number;
}

export interface ComposeService {
  name: string;
  image: string;
  state: string;
  ports: string;
}

export interface ComposeProjectsResponse {
  data: ComposeProject[];
}

export interface ComposeServicesResponse {
  data: ComposeService[];
}

export interface ComposeControlResponse {
  data: {
    status: string;
    action: string;
  };
}

export interface ComposeLogsResponse {
  data: {
    logs: string;
  };
}

export async function fetchComposeProjects() {
  return api.get<ComposeProjectsResponse>("/docker/compose");
}

export async function fetchComposeServices(name: string) {
  return api.get<ComposeServicesResponse>("/docker/compose/" + encodeURIComponent(name));
}

export async function controlComposeProject(
  name: string,
  action: "up" | "down" | "restart",
  filePath?: string
) {
  return api.post<ComposeControlResponse>(
    "/docker/compose/" + encodeURIComponent(name) + "/control",
    { action, filePath: filePath || "" }
  );
}

export async function fetchComposeLogs(name: string, tail?: number) {
  const params = tail ? "?tail=" + tail : "";
  return api.get<ComposeLogsResponse>(
    "/docker/compose/" + encodeURIComponent(name) + "/logs" + params
  );
}

// ── Compose File Editor ──

export interface ComposeFileResponse {
  data: {
    path: string;
    content: string;
  };
}

export interface ComposeValidateResponse {
  data: {
    status: string;
    output: string;
  };
}

export interface ComposeDeployResponse {
  data: {
    status: string;
  };
}

export async function readComposeFile(path: string) {
  return api.get<ComposeFileResponse>("/docker/compose/file?path=" + encodeURIComponent(path));
}

export async function writeComposeFile(path: string, content: string) {
  return api.put<{ data: { status: string; path: string } }>("/docker/compose/file", { path, content });
}

export async function validateComposeFile(path: string) {
  return api.post<ComposeValidateResponse>("/docker/compose/file/validate", { path });
}

export async function deployComposeFile(path: string) {
  return api.post<ComposeDeployResponse>("/docker/compose/file/deploy", { path });
}

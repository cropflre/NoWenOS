import { api } from "@/api/http";

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modTime: string;
}

export interface BrowseResult {
  path: string;
  parent: string;
  entries: FileEntry[];
}

export interface BrowseResponse {
  data: BrowseResult;
}

export interface UploadResponse {
  data: FileEntry;
}

export interface DeleteResponse {
  data: {
    status: string;
  };
}

export interface MkdirResponse {
  data: FileEntry;
}

export async function browseFiles(path: string) {
  return api.get<BrowseResponse>(`/files/browse?path=${encodeURIComponent(path)}`);
}

export async function uploadFile(dirPath: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/v1/files/upload?path=${encodeURIComponent(dirPath)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "Upload failed");
  }

  return (await response.json()) as UploadResponse;
}

export async function deleteFile(path: string) {
  return api.delete<DeleteResponse>(`/files/delete?path=${encodeURIComponent(path)}`);
}

export async function createDirectory(parentPath: string, dirName: string) {
  return api.post<MkdirResponse>("/files/mkdir", { parentPath, dirName });
}

export function downloadFile(path: string) {
  const token = getToken();
  const url = `/api/v1/files/download?path=${encodeURIComponent(path)}`;

  // Create a temporary link and click it
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", "");

  // Add auth header via fetch and create blob URL
  fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) throw new Error("Download failed");
      return response.blob();
    })
    .then((blob) => {
      const blobUrl = window.URL.createObjectURL(blob);
      a.href = blobUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    })
    .catch((err) => {
      console.error("Download failed:", err);
    });
}

function getToken(): string | null {
  try {
    const stored = localStorage.getItem("nowenos-session");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.token ?? null;
    }
  } catch {
    // ignore
  }
  return null;
}

export interface RenameResponse {
  data: FileEntry;
}

export interface MoveResponse {
  data: FileEntry;
}

export async function renameFile(path: string, newName: string) {
  return api.post<RenameResponse>("/files/rename", { path, newName });
}

export async function moveFile(sourcePath: string, destDir: string) {
  return api.post<MoveResponse>("/files/move", { sourcePath, destDir });
}

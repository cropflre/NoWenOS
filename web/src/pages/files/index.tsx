import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";
import {
  browseFiles,
  uploadFile,
  downloadFile,
  deleteFile,
  createDirectory,
} from "@/features/files/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/stores/toast";
import {
  Folder,
  File,
  Upload,
  Download,
  Trash2,
  FolderPlus,
  ArrowLeft,
} from "lucide-react";

export default function FilesPage() {
  const t = useTranslation();
  const [currentPath, setCurrentPath] = useState(".");
  const [showMkdir, setShowMkdir] = useState(false);
  const [newDirName, setNewDirName] = useState("");
  const [fileInputEl, setFileInputEl] = useState<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const filesQuery = useQuery({
    queryKey: ["files", currentPath],
    queryFn: () => browseFiles(currentPath),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ path, file }: { path: string; file: globalThis.File }) => uploadFile(path, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", currentPath] });
      toast.success(t("files.uploadSuccess"));
    },
    onError: () => {
      toast.error(t("files.uploadFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (path: string) => deleteFile(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", currentPath] });
      toast.success(t("files.deleteSuccess"));
    },
    onError: () => {
      toast.error(t("files.deleteFailed"));
    },
  });

  const mkdirMutation = useMutation({
    mutationFn: ({ parentPath, dirName }: { parentPath: string; dirName: string }) =>
      createDirectory(parentPath, dirName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", currentPath] });
      setNewDirName("");
      setShowMkdir(false);
      toast.success(t("files.folderCreated"));
    },
    onError: () => {
      toast.error(t("files.folderFailed"));
    },
  });

  const result = filesQuery.data?.data;

  function handleNavigate(path: string) {
    setCurrentPath(path);
  }

  function handleGoUp() {
    if (result?.parent) {
      setCurrentPath(result.parent);
    }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    uploadMutation.mutate({ path: currentPath, file: f });
    e.target.value = "";
  }

  function handleDownload(filePath: string) {
    downloadFile(filePath);
  }

  function handleDelete(filePath: string, name: string) {
    if (confirm(`${t("common.confirm")} "${name}"?`)) {
      deleteMutation.mutate(filePath);
    }
  }

  function handleMkdir() {
    if (!newDirName.trim()) return;
    mkdirMutation.mutate({ parentPath: currentPath, dirName: newDirName.trim() });
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("files.title")}</h1>
          <p className="text-sm text-muted-foreground">{result?.path ?? currentPath}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGoUp} disabled={!result?.parent}>
            <ArrowLeft className="mr-1 h-3 w-3" />
            {t("files.up")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowMkdir(!showMkdir)}>
            <FolderPlus className="mr-1 h-3 w-3" />
            {t("files.newFolder")}
          </Button>
          <input
            ref={setFileInputEl}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="default"
            size="sm"
            onClick={() => fileInputEl?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="mr-1 h-3 w-3" />
            {t("files.upload")}
          </Button>
        </div>
      </div>

      {showMkdir && (
        <Card>
          <CardContent className="flex items-center gap-2 py-3">
            <input
              type="text"
              value={newDirName}
              onChange={(e) => setNewDirName(e.target.value)}
              placeholder={t("files.newFolderName")}
              className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && handleMkdir()}
            />
            <Button size="sm" onClick={handleMkdir} disabled={mkdirMutation.isPending}>
              {t("files.create")}
            </Button>
          </CardContent>
        </Card>
      )}

      {filesQuery.isLoading && <p className="text-sm text-muted-foreground">{t("files.loading")}</p>}

      {filesQuery.isError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{t("files.failed")}</p>
          </CardContent>
        </Card>
      )}

      {result && result.entries.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("files.empty")}</p>
          </CardContent>
        </Card>
      )}

      {result && result.entries.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              <div className="grid grid-cols-[1fr_120px_180px_120px] px-4 py-2 text-xs font-medium text-muted-foreground">
                <span>{t("files.name")}</span>
                <span className="text-right">{t("files.size")}</span>
                <span className="text-right">{t("files.modified")}</span>
                <span className="text-right">{t("files.actions")}</span>
              </div>

              {result.entries.map((entry) => (
                <div
                  key={entry.path}
                  className="grid grid-cols-[1fr_120px_180px_120px] items-center px-4 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <button
                    type="button"
                    className="flex items-center gap-2 text-left"
                    onClick={() => entry.isDir && handleNavigate(entry.path)}
                  >
                    {entry.isDir ? (
                      <Folder className="h-4 w-4 text-blue-500" />
                    ) : (
                      <File className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={entry.isDir ? "font-medium" : ""}>{entry.name}</span>
                  </button>
                  <span className="text-right text-sm text-muted-foreground">
                    {entry.isDir ? "\u2014" : formatSize(entry.size)}
                  </span>
                  <span className="text-right text-sm text-muted-foreground">{entry.modTime}</span>
                  <div className="text-right">
                    {!entry.isDir && (
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(entry.path)} className="h-8 w-8 p-0">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry.path, entry.name)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
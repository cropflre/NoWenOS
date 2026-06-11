import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";
import {
  browseFiles,
  uploadFile,
  downloadFile,
  deleteFile,
  createDirectory,
  renameFile,
  searchFiles,
  compressFiles,
  extractFile,
} from "@/features/files/api";
import { trashFile } from "@/features/recycle/api";
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
  Pencil,
  Eye,
  Search,
  Archive,
  Package,
  CheckSquare,
  Square,
} from "lucide-react";
import { FilePreview } from "@/components/FilePreview";

export default function FilesPage() {
  const t = useTranslation();
  const [currentPath, setCurrentPath] = useState(".");
  const [showMkdir, setShowMkdir] = useState(false);
  const [newDirName, setNewDirName] = useState("");
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ path: string; name: string } | null>(null);
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

  const renameMutation = useMutation({
    mutationFn: ({ path, newName }: { path: string; newName: string }) => renameFile(path, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", currentPath] });
      setRenamingPath(null);
      setNewName("");
      toast.success(t("files.renameSuccess"));
    },
    onError: () => toast.error(t("files.renameFailed")),
  });

  const compressMutation = useMutation({
    mutationFn: ({ paths, dest }: { paths: string[]; dest: string }) => compressFiles(paths, dest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", currentPath] });
      setSelectedPaths(new Set());
      toast.success(t("files.compressSuccess"));
    },
    onError: () => toast.error(t("files.compressFailed")),
  });

  const extractMutation = useMutation({
    mutationFn: ({ path, dir }: { path: string; dir: string }) => extractFile(path, dir),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", currentPath] });
      toast.success(t("files.extractSuccess"));
    },
    onError: () => toast.error(t("files.extractFailed")),
  });

  const trashMutation = useMutation({
    mutationFn: (path: string) => trashFile(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", currentPath] });
      toast.success(t("files.trashSuccess"));
    },
    onError: () => toast.error(t("files.trashFailed")),
  });


  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        uploadMutation.mutate({ path: currentPath, file: files[i] });
      }
    }
  }

  async function handleSearch(q: string) {
    if (!q.trim()) { setSearchResults(null); return; }
    try {
      const res = await searchFiles(currentPath, q);
      setSearchResults(res.data ?? []);
    } catch { setSearchResults([]); }
  }

  function toggleSelect(path: string) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  function toggleSelectAll() {
    const entries = result?.entries ?? [];
    if (selectedPaths.size === entries.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(entries.map((e) => e.path)));
    }
  }

  function handleBatchDelete() {
    for (const p of selectedPaths) trashMutation.mutate(p);
    setSelectedPaths(new Set());
  }

  function handleBatchCompress() {
    const dest = currentPath + "/archive-" + Date.now() + ".tar.gz";
    compressMutation.mutate({ paths: Array.from(selectedPaths), dest });
  }

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

  function handleDelete(filePath: string) {
    trashMutation.mutate(filePath);
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
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{t("files.title")}</h1>
          {result && (
            <span className="text-xs text-muted-foreground bg-muted/50 rounded-full px-2.5 py-0.5 font-medium">
              {result.entries.length} {result.entries.length === 1 ? "item" : "items"}
            </span>
          )}
          <span className="font-mono text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
            {result?.path ?? currentPath}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGoUp} disabled={!result?.parent} className="rounded-xl border-border bg-muted/30 hover:bg-muted/50">
            <ArrowLeft className="mr-1 h-3 w-3" />
            {t("files.up")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowMkdir(!showMkdir)} className="rounded-xl border-border bg-muted/30 hover:bg-muted/50">
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
            className="rounded-xl"
          >
            <Upload className="mr-1 h-3 w-3" />
            {t("files.upload")}
          </Button>
        </div>
      </div>

      {showMkdir && (
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-2 py-3">
            <input
              type="text"
              value={newDirName}
              onChange={(e) => setNewDirName(e.target.value)}
              placeholder={t("files.newFolderName")}
              className="flex h-9 flex-1 rounded-md border border-border bg-muted/50 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
        <Card className="border-border relative" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e.target.value); }}
            placeholder={t("files.searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-muted/50 pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        {selectedPaths.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selectedPaths.size} selected</span>
            <Button variant="outline" size="sm" onClick={handleBatchCompress} className="h-8 text-xs">
              <Archive className="mr-1 h-3 w-3" />{t("files.compress")}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBatchDelete} className="h-8 text-xs">
              <Trash2 className="mr-1 h-3 w-3" />{t("files.batchDelete")}
            </Button>
          </div>
        )}
      </div>

      {/* Search results */}
      {searchResults && (
        <Card className="border-border">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("files.searchResults")} ({searchResults.length})</p>
            {searchResults.length === 0 && <p className="text-xs text-muted-foreground">{t("files.noResults")}</p>}
            {searchResults.map((f: any) => (
              <div key={f.path} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50 text-sm">
                {f.isDir ? <Folder className="h-3.5 w-3.5 text-cyan-400" /> : <File className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="truncate">{f.path}</span>
              </div>
            ))}
            <button onClick={() => setSearchResults(null)} className="mt-2 text-xs text-muted-foreground hover:text-foreground">Close results</button>
          </CardContent>
        </Card>
      )}

      {isDragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5">
              <div className="flex flex-col items-center gap-2 text-primary">
                <Upload className="h-8 w-8" />
                <span className="text-sm font-medium">{t("files.dropUpload")}</span>
              </div>
            </div>
          )}
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[36px_1fr_120px_180px_120px] px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
                <span className="flex items-center justify-center">
                  <button onClick={toggleSelectAll} className="h-4 w-4">
                    {selectedPaths.size > 0 && selectedPaths.size === (result?.entries.length ?? 0) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </span>
                <span>{t("files.name")}</span>
                <span className="text-right">{t("files.size")}</span>
                <span className="text-right">{t("files.modified")}</span>
                <span className="text-right">{t("files.actions")}</span>
              </div>

              {result.entries.map((entry) => (
                <div
                  key={entry.path}
                  className="grid grid-cols-[36px_1fr_120px_180px_120px] items-center px-4 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <span className="flex items-center justify-center">
                    <button onClick={() => toggleSelect(entry.path)}>
                      {selectedPaths.has(entry.path) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </span>
                  {renamingPath === entry.path ? (
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renameMutation.mutate({ path: entry.path, newName });
                        if (e.key === "Escape") { setRenamingPath(null); setNewName(""); }
                      }}
                      onBlur={() => { setRenamingPath(null); setNewName(""); }}
                      className="h-7 w-48 rounded border border-primary bg-muted px-2 text-sm"
                    />
                  ) : (
                    <button
                      type="button"
                      className="flex items-center gap-2 text-left"
                      onClick={() => entry.isDir && handleNavigate(entry.path)}
                    >
                      {entry.isDir ? (
                        <Folder className="h-4 w-4 text-cyan-400" />
                      ) : (
                        <File className="h-4 w-4 text-muted-foreground/60" />
                      )}
                      <span className={entry.isDir ? "font-medium" : ""}>{entry.name}</span>
                    </button>
                  )}
                  <span className="text-right text-sm text-muted-foreground">
                    {entry.isDir ? "\u2014" : formatSize(entry.size)}
                  </span>
                  <span className="text-right text-sm text-muted-foreground">{entry.modTime}</span>
                  <div className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setRenamingPath(entry.path); setNewName(entry.name); }} className="h-8 w-8 p-0">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!entry.isDir && entry.name.endsWith(".tar.gz") && (
                      <Button variant="ghost" size="sm" onClick={() => extractMutation.mutate({ path: entry.path, dir: currentPath })} className="h-8 w-8 p-0" title={t("files.extract")}>
                        <Package className="h-4 w-4" />
                      </Button>
                    )}
                    {!entry.isDir && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setPreviewFile({ path: entry.path, name: entry.name })} className="h-8 w-8 p-0" title={t("files.preview")}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(entry.path)} className="h-8 w-8 p-0">
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry.path)}
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
      {previewFile && (
        <FilePreview path={previewFile.path} name={previewFile.name} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}

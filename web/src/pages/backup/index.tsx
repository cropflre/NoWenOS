import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";
import { fetchBackups, createBackup, deleteBackup, restoreBackup } from "@/features/backup/api";
import type { BackupInfo } from "@/features/backup/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/stores/toast";
import { Archive, Download, RotateCcw, Trash2, HardDrive } from "lucide-react";

export default function BackupPage() {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const backupsQuery = useQuery({
    queryKey: ["backups"],
    queryFn: fetchBackups,
  });

  const createMutation = useMutation({
    mutationFn: createBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      toast.success(t("backup.createSuccess"));
    },
    onError: () => toast.error(t("backup.createFailed")),
  });

  const restoreMutation = useMutation({
    mutationFn: (name: string) => restoreBackup(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      setConfirmRestore(null);
      toast.success(t("backup.restoreSuccess"));
    },
    onError: () => toast.error(t("backup.restoreFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => deleteBackup(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      setConfirmDelete(null);
      toast.success(t("backup.deleteSuccess"));
    },
    onError: () => toast.error(t("backup.deleteFailed")),
  });

  const backups: BackupInfo[] = backupsQuery.data?.data ?? [];

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("backup.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("backup.subtitle")}</p>
        </div>
        <Button
          size="sm"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          <Archive className="mr-1.5 h-4 w-4" />
          {t("backup.create")}
        </Button>
      </div>

      <Card className="border-border bg-muted/30">
        <CardContent className="flex items-center gap-2 py-3 px-4 text-sm text-muted-foreground">
          <HardDrive className="h-4 w-4" />
          <span>/var/lib/nowenos/backups/</span>
        </CardContent>
      </Card>

      {backupsQuery.isLoading && (
        <p className="text-sm text-muted-foreground">{t("backup.loading")}</p>
      )}

      {backupsQuery.isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{String(backupsQuery.error?.message ?? "Error")}</p>
          </CardContent>
        </Card>
      )}

      {backups.length === 0 && !backupsQuery.isLoading && (
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("backup.noBackups")}</p>
          </CardContent>
        </Card>
      )}

      {backups.length > 0 && (
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[1fr_140px_200px_180px] px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
                <span>{t("backup.name")}</span>
                <span className="text-right">{t("backup.size")}</span>
                <span className="text-right">{t("backup.date")}</span>
                <span className="text-right">{t("files.actions")}</span>
              </div>
              {backups.map((b) => (
                <div
                  key={b.name}
                  className="grid grid-cols-[1fr_140px_200px_180px] items-center px-4 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-muted-foreground/60" />
                    <span className="font-mono text-sm truncate">{b.name}</span>
                  </div>
                  <span className="text-right text-sm text-muted-foreground">
                    {formatSize(b.size)}
                  </span>
                  <span className="text-right text-sm text-muted-foreground">
                    {formatDate(b.createdAt)}
                  </span>
                  <div className="flex justify-end gap-1">
                    {confirmRestore === b.name ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-destructive">{t("backup.restoreConfirm")}</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => restoreMutation.mutate(b.name)}
                          disabled={restoreMutation.isPending}
                        >
                          {t("common.yes")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setConfirmRestore(null)}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    ) : confirmDelete === b.name ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-destructive">{t("backup.deleteConfirm")}</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => deleteMutation.mutate(b.name)}
                          disabled={deleteMutation.isPending}
                        >
                          {t("common.yes")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setConfirmDelete(null)}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title={t("backup.restore")}
                          onClick={() => setConfirmRestore(b.name)}
                        >
                          <RotateCcw className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title={t("backup.delete")}
                          onClick={() => setConfirmDelete(b.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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

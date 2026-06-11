import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";
import {
  fetchRecycleItems,
  restoreItem,
  permanentDelete,
  emptyTrash,
} from "@/features/recycle/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/stores/toast";
import { Trash2, RotateCcw, Folder, File, XCircle } from "lucide-react";

export default function RecyclePage() {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const itemsQuery = useQuery({
    queryKey: ["recycle-bin"],
    queryFn: fetchRecycleItems,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recycle-bin"] });
      toast.success(t("recycle.restored"));
    },
    onError: () => toast.error(t("recycle.restoreFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => permanentDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recycle-bin"] });
      toast.success(t("recycle.deleted"));
    },
    onError: () => toast.error(t("recycle.deleteFailed")),
  });

  const emptyMutation = useMutation({
    mutationFn: emptyTrash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recycle-bin"] });
      setConfirmEmpty(false);
      toast.success(t("recycle.emptied"));
    },
    onError: () => toast.error(t("recycle.emptyFailed")),
  });

  const items = itemsQuery.data?.data ?? [];

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{t("recycle.title")}</h1>
          <span className="text-xs text-muted-foreground bg-muted/50 rounded-full px-2.5 py-0.5 font-medium">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
        <div className="flex gap-2">
          {confirmEmpty ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-danger">{t("recycle.confirmEmpty")}</span>
              <Button variant="destructive" size="sm" onClick={() => emptyMutation.mutate()} disabled={emptyMutation.isPending}>
                {t("recycle.yes")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmEmpty(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          ) : (
            <Button variant="destructive" size="sm" onClick={() => setConfirmEmpty(true)} disabled={items.length === 0}>
              <Trash2 className="mr-1 h-3 w-3" />
              {t("recycle.emptyTrash")}
            </Button>
          )}
        </div>
      </div>

      {itemsQuery.isLoading && <p className="text-sm text-muted-foreground">{t("recycle.loading")}</p>}
      {itemsQuery.isError && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="pt-6"><p className="text-sm text-danger">{t("recycle.failed")}</p></CardContent>
        </Card>
      )}
      {items.length === 0 && !itemsQuery.isLoading && (
        <Card className="border-border bg-card">
          <CardContent className="pt-6"><p className="text-sm text-muted-foreground">{t("recycle.empty")}</p></CardContent>
        </Card>
      )}

      {items.length > 0 && (
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[1fr_180px_120px_140px] px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
                <span>{t("files.name")}</span>
                <span className="text-right">{t("recycle.originalPath")}</span>
                <span className="text-right">{t("files.size")}</span>
                <span className="text-right">{t("files.actions")}</span>
              </div>
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_180px_120px_140px] items-center px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    {item.isDir ? <Folder className="h-4 w-4 text-cyan-400" /> : <File className="h-4 w-4 text-muted-foreground/60" />}
                    <span className={item.isDir ? "font-medium" : ""}>{item.name}</span>
                  </div>
                  <span className="text-right text-xs text-muted-foreground font-mono truncate">{item.originalPath}</span>
                  <span className="text-right text-sm text-muted-foreground">{formatSize(item.size)}</span>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => restoreMutation.mutate(item.id)} className="h-8 w-8 p-0" title={t("recycle.restore")}>
                      <RotateCcw className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm(t("recycle.confirmDelete"))) deleteMutation.mutate(item.id); }} className="h-8 w-8 p-0 text-destructive hover:text-destructive" title={t("recycle.permanentDelete")}>
                      <XCircle className="h-4 w-4" />
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

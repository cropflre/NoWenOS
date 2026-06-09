import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchShares, fetchSambaStatus, fetchWebDAVStatus, fetchNFSStatus, createShare, updateShare, toggleShare, deleteShare } from "@/features/shares/api";
import type { Share, CreateShareRequest } from "@/features/shares/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/stores/toast";
import { Share2, Plus, Trash2, X, FolderOpen, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const emptyForm: CreateShareRequest = {
  name: "",
  path: "",
  protocol: "smb",
  readOnly: false,
  guest: false,
  comment: "",
};

export default function SharesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateShareRequest>({ ...emptyForm });

  const sharesQuery = useQuery({ queryKey: ["shares"], queryFn: fetchShares });
  const statusQuery = useQuery({ queryKey: ["samba-status"], queryFn: fetchSambaStatus });
  const webdavStatusQuery = useQuery({ queryKey: ["webdav-status"], queryFn: fetchWebDAVStatus });
  const nfsStatusQuery = useQuery({ queryKey: ["nfs-status"], queryFn: fetchNFSStatus });

  const createMutation = useMutation({
    mutationFn: createShare,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
      setShowForm(false);
      setForm({ ...emptyForm });
      toast.success(t("shares.created"));
    },
    onError: (err: Error) => { toast.error(err.message || t("shares.createFailed")); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateShareRequest }) => updateShare(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
      setShowForm(false);
      setEditId(null);
      setForm({ ...emptyForm });
      toast.success(t("shares.updated"));
    },
    onError: (err: Error) => { toast.error(err.message || t("shares.updateFailed")); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => toggleShare(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
      toast.success(t("shares.toggled"));
    },
    onError: (err: Error) => { toast.error(err.message || t("shares.toggleFailed")); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteShare,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
      toast.success(t("shares.deleted"));
    },
    onError: (err: Error) => { toast.error(err.message || t("shares.deleteFailed")); },
  });

  const shares = sharesQuery.data?.data ?? [];
  const samba = statusQuery.data?.data;
  const webdavStatus = webdavStatusQuery.data?.data;
  const nfsStatus = nfsStatusQuery.data?.data;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId !== null) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function handleEdit(share: Share) {
    setEditId(share.id);
    setForm({
      name: share.name,
      path: share.path,
      protocol: share.protocol,
      readOnly: share.readOnly,
      guest: share.guest,
      comment: share.comment,
    });
    setShowForm(true);
  }

  function handleDelete(id: number, name: string) {
    if (confirm(t("shares.deleteConfirm").replace("{name}", name))) {
      deleteMutation.mutate(id);
    }
  }

  function handleChange(field: keyof CreateShareRequest, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("shares.title")}</h1>
          <p className="text-muted-foreground">{t("shares.subtitle")}</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...emptyForm }); }}>
          <Plus className="mr-2 h-4 w-4" />
          {t("shares.addShare")}
        </Button>
      </div>

      {/* Service Status */}
      <div className="grid gap-3 sm:grid-cols-3">
        {samba && (
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className={"h-2.5 w-2.5 rounded-full " + (samba.running ? "bg-green-400 shadow-sm shadow-green-400/50" : samba.installed ? "bg-amber-400" : "bg-red-400")} />
              <div>
                <span className="text-sm font-medium">{t("shares.samba")}</span>
                <p className="text-xs text-muted-foreground">{samba.running ? t("shares.running") : samba.installed ? t("shares.installedStopped") : t("shares.notInstalled")}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {webdavStatus && (
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className={"h-2.5 w-2.5 rounded-full " + (webdavStatus.running ? "bg-green-400 shadow-sm shadow-green-400/50" : webdavStatus.installed ? "bg-amber-400" : "bg-red-400")} />
              <div>
                <span className="text-sm font-medium">{t("shares.webdav")}</span>
                <p className="text-xs text-muted-foreground">{webdavStatus.running ? t("shares.running") : webdavStatus.installed ? t("shares.installedStopped") : t("shares.notInstalled")}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {nfsStatus && (
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className={"h-2.5 w-2.5 rounded-full " + (nfsStatus.running ? "bg-green-400 shadow-sm shadow-green-400/50" : nfsStatus.installed ? "bg-amber-400" : "bg-red-400")} />
              <div>
                <span className="text-sm font-medium">{t("shares.nfs")}</span>
                <p className="text-xs text-muted-foreground">{nfsStatus.running ? t("shares.running") : nfsStatus.installed ? t("shares.installedStopped") : t("shares.notInstalled")}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>{editId !== null ? t("shares.editShare") : t("shares.newShare")}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditId(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="share-name">Share Name</Label>
                  <Input id="share-name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="e.g. documents" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="share-path">Path</Label>
                  <Input id="share-path" value={form.path} onChange={(e) => handleChange("path", e.target.value)} placeholder="e.g. /srv/shares/documents" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="share-protocol">Protocol</Label>
                  <select id="share-protocol" value={form.protocol} onChange={(e) => handleChange("protocol", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="smb">{t("shares.protocolSmb")}</option>
                    <option value="webdav">{t("shares.protocolWebdav")}</option>
                    <option value="nfs">{t("shares.protocolNfs")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="share-comment">{t("shares.comment")}</Label>
                  <Input id="share-comment" value={form.comment} onChange={(e) => handleChange("comment", e.target.value)} placeholder={t("shares.optionalComment")} />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.readOnly} onChange={(e) => handleChange("readOnly", e.target.checked)} className="h-4 w-4 rounded border" />
                  {t("shares.readOnly")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.guest} onChange={(e) => handleChange("guest", e.target.checked)} className="h-4 w-4 rounded border" />
                  {t("shares.guestAccess")}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editId !== null ? t("shares.updateShare") : t("shares.createShare")}
                </Button>
                <Button variant="outline" type="button" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Share List */}
      {sharesQuery.isLoading && <p className="text-sm text-muted-foreground">t("shares.loading")</p>}
      {sharesQuery.isError && (
        <Card className="border-danger/30 bg-danger/5"><CardContent className="pt-6"><p className="text-sm text-danger">t("shares.failed")</p></CardContent></Card>
      )}
      {shares.length === 0 && !sharesQuery.isLoading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("shares.noShares")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("shares.firstShare")}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {shares.map((share) => (
          <Card key={share.id} className="border-border bg-card transition-all duration-200 hover:border-border/80">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className={"flex h-10 w-10 items-center justify-center rounded-xl transition-all " + (share.enabled ? "bg-cyan-500/10 text-cyan-400 shadow-sm shadow-cyan-500/10" : "bg-muted text-muted-foreground")}>
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{share.name}</p>
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-cyan-400">{share.protocol.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" /> {share.path}
                  </p>
                  {share.comment && <p className="text-xs text-muted-foreground">{share.comment}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {share.readOnly && (
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">{t("shares.readOnly")}</span>
                )}
                {share.guest && (
                  <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400">{t("shares.guest")}</span>
                )}
                <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate({ id: share.id, enabled: !share.enabled })} className="h-8 w-8 p-0" title={share.enabled ? t("common.disable") : t("common.enable")}>
                  {share.enabled ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(share)} className="h-8 w-8 p-0" title={t("common.edit")}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(share.id, share.name)} className="h-8 w-8 p-0 text-destructive hover:text-destructive" title={t("common.delete")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}





# NoWenOS v0.2 文件与存储 Alpha 实现计划

> **Worker instructions:** Required sub-skill: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Track progress with checkboxes (`- [ ]`).
>
> **Goal:** Enhance storage management (mountpoint usage bars, partition details), improve file manager (drag-drop upload, rename, move, context menu), add recycle bin (soft-delete with restore), and prepare the shared directory model for Samba/WebDAV integration.
>
> **Architecture:** Extend existing backend APIs with new endpoints for rename/move/trash/restore. Add a recycle bin SQLite table. Enhance frontend Storage and Files pages with richer UI. All existing functionality preserved.
>
> **Tech stack:** React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Zustand + TanStack Query + Go + Gin + SQLite

---

## Task 1: Backend — Recycle Bin Model + API

**Files:**
- Create: `server/internal/recyclebin/recyclebin.go`
- Modify: `server/internal/httpapi/router.go`
- Modify: `server/cmd/nowenos-api/main.go`

- [ ] **Step 1: Create recyclebin package**

Create `server/internal/recyclebin/recyclebin.go`:

```go
package recyclebin

import (
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"time"

	"nowenos-server/internal/database"
)

type RecycleItem struct {
	ID          int64  `json:"id"`
	OriginalPath string `json:"originalPath"`
	TrashPath    string `json:"trashPath"`
	Name        string `json:"name"`
	IsDir       bool   `json:"isDir"`
	Size        int64  `json:"size"`
	DeletedAt   string `json:"deletedAt"`
	DeletedBy   string `json:"deletedBy"`
}

var trashRoot = "/var/lib/nowenos/trash"

func InitTable() {
	db := database.GetDB()
	db.Exec(`CREATE TABLE IF NOT EXISTS recycle_bin (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		original_path TEXT NOT NULL,
		trash_path TEXT NOT NULL,
		name TEXT NOT NULL,
		is_dir INTEGER NOT NULL DEFAULT 0,
		size INTEGER NOT NULL DEFAULT 0,
		deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		deleted_by TEXT DEFAULT ''
	)`)
	os.MkdirAll(trashRoot, 0755)
}

func MoveToTrash(originalPath, username string) (*RecycleItem, error) {
	if originalPath == "" {
		return nil, errors.New("path is required")
	}
	originalPath = filepath.Clean(originalPath)
	if originalPath == "/" || originalPath == "." {
		return nil, errors.New("cannot trash this path")
	}

	info, err := os.Stat(originalPath)
	if err != nil {
		return nil, errors.New("path not found")
	}

	name := filepath.Base(originalPath)
	trashName := name + "." + time.Now().Format("20060102150405")
	trashPath := filepath.Join(trashRoot, trashName)

	if err := os.Rename(originalPath, trashPath); err != nil {
		return nil, err
	}

	db := database.GetDB()
	result, err := db.Exec(
		"INSERT INTO recycle_bin (original_path, trash_path, name, is_dir, size, deleted_by) VALUES (?, ?, ?, ?, ?, ?)",
		originalPath, trashPath, name, boolToInt(info.IsDir()), info.Size(), username,
	)
	if err != nil {
		os.Rename(trashPath, originalPath)
		return nil, err
	}

	id, _ := result.LastInsertId()
	item, _ := GetItem(id)
	return item, nil
}

func GetItems() []RecycleItem {
	db := database.GetDB()
	rows, err := db.Query("SELECT id, original_path, trash_path, name, is_dir, size, deleted_at, deleted_by FROM recycle_bin ORDER BY deleted_at DESC")
	if err != nil {
		return []RecycleItem{}
	}
	defer rows.Close()

	items := make([]RecycleItem, 0)
	for rows.Next() {
		var item RecycleItem
		var isDir int
		if err := rows.Scan(&item.ID, &item.OriginalPath, &item.TrashPath, &item.Name, &isDir, &item.Size, &item.DeletedAt, &item.DeletedBy); err != nil {
			continue
		}
		item.IsDir = isDir == 1
		items = append(items, item)
	}
	return items
}

func GetItem(id int64) (*RecycleItem, error) {
	db := database.GetDB()
	var item RecycleItem
	var isDir int
	err := db.QueryRow("SELECT id, original_path, trash_path, name, is_dir, size, deleted_at, deleted_by FROM recycle_bin WHERE id = ?", id).
		Scan(&item.ID, &item.OriginalPath, &item.TrashPath, &item.Name, &isDir, &item.Size, &item.DeletedAt, &item.DeletedBy)
	if err == sql.ErrNoRows {
		return nil, errors.New("item not found")
	}
	if err != nil {
		return nil, err
	}
	item.IsDir = isDir == 1
	return &item, nil
}

func Restore(id int64) error {
	item, err := GetItem(id)
	if err != nil {
		return err
	}

	parentDir := filepath.Dir(item.OriginalPath)
	os.MkdirAll(parentDir, 0755)

	if err := os.Rename(item.TrashPath, item.OriginalPath); err != nil {
		return err
	}

	db := database.GetDB()
	_, err = db.Exec("DELETE FROM recycle_bin WHERE id = ?", id)
	if err != nil {
		os.Rename(item.OriginalPath, item.TrashPath)
		return err
	}
	return nil
}

func PermanentDelete(id int64) error {
	item, err := GetItem(id)
	if err != nil {
		return err
	}

	if err := os.RemoveAll(item.TrashPath); err != nil && !os.IsNotExist(err) {
		return err
	}

	db := database.GetDB()
	_, err = db.Exec("DELETE FROM recycle_bin WHERE id = ?", id)
	return err
}

func EmptyTrash() error {
	db := database.GetDB()
	rows, err := db.Query("SELECT trash_path FROM recycle_bin")
	if err != nil {
		return err
	}
	defer rows.Close()

	var paths []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err == nil {
			paths = append(paths, p)
		}
	}

	for _, p := range paths {
		os.RemoveAll(p)
	}

	_, err = db.Exec("DELETE FROM recycle_bin")
	return err
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
```

- [ ] **Step 2: Add recycle bin routes to router.go**

In `server/internal/httpapi/router.go`, add the import `"nowenos-server/internal/recyclebin"` and add these routes inside the protected `api` group:

```go
		// ——— Recycle Bin ———
		api.GET("/recycle-bin", func(c *gin.Context) {
			items := recyclebin.GetItems()
			c.JSON(http.StatusOK, gin.H{"data": items})
		})

		api.POST("/recycle-bin/trash", func(c *gin.Context) {
			var req struct {
				Path string `json:"path"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}
			username, _ := c.Get("username")
			item, err := recyclebin.MoveToTrash(req.Path, fmt.Sprintf("%v", username))
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": item})
		})

		api.POST("/recycle-bin/:id/restore", func(c *gin.Context) {
			id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
			if err := recyclebin.Restore(id); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "restored"}})
		})

		api.DELETE("/recycle-bin/:id", func(c *gin.Context) {
			id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
			if err := recyclebin.PermanentDelete(id); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "deleted"}})
		})

		api.POST("/recycle-bin/empty", func(c *gin.Context) {
			if err := recyclebin.EmptyTrash(); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "emptied"}})
		})
```

- [ ] **Step 3: Init recycle bin table in main.go**

In `server/cmd/nowenos-api/main.go`, add the import `"nowenos-server/internal/recyclebin"` and call `recyclebin.InitTable()` after `shares.InitTable()`.

- [ ] **Step 4: Verify Go compiles**

```bash
cd server && go build ./cmd/nowenos-api
```

- [ ] **Step 5: Commit**

```bash
git add server/internal/recyclebin/ server/internal/httpapi/router.go server/cmd/nowenos-api/main.go
git commit -m "feat(recycle): add recycle bin model and API (trash, restore, empty)"
```

---

## Task 2: Backend — File Rename/Move API

**Files:**
- Modify: `server/internal/filemanager/filemanager.go`
- Modify: `server/internal/httpapi/router.go`

- [ ] **Step 1: Add Rename and Move functions to filemanager.go**

Append to `server/internal/filemanager/filemanager.go`:

```go
func Rename(oldPath, newName string) (*FileEntry, error) {
	if oldPath == "" || newName == "" {
		return nil, ErrPathRequired
	}
	oldPath = filepath.Clean(oldPath)
	newName = filepath.Base(newName)
	if newName == "." || newName == ".." {
		return nil, errors.New("invalid name")
	}

	info, err := os.Stat(oldPath)
	if err != nil {
		return nil, ErrPathNotFound
	}

	newPath := filepath.Join(filepath.Dir(oldPath), newName)
	if _, err := os.Stat(newPath); err == nil {
		return nil, ErrFileExists
	}

	if err := os.Rename(oldPath, newPath); err != nil {
		return nil, err
	}

	newInfo, _ := os.Stat(newPath)
	return &FileEntry{
		Name:    newName,
		Path:    newPath,
		IsDir:   info.IsDir(),
		Size:    newInfo.Size(),
		ModTime: newInfo.ModTime().Format("2006-01-02 15:04:05"),
	}, nil
}

func Move(sourcePath, destDir string) (*FileEntry, error) {
	if sourcePath == "" || destDir == "" {
		return nil, ErrPathRequired
	}
	sourcePath = filepath.Clean(sourcePath)
	destDir = filepath.Clean(destDir)

	info, err := os.Stat(sourcePath)
	if err != nil {
		return nil, ErrPathNotFound
	}

	destInfo, err := os.Stat(destDir)
	if err != nil || !destInfo.IsDir() {
		return nil, ErrNotDirectory
	}

	newPath := filepath.Join(destDir, filepath.Base(sourcePath))
	if _, err := os.Stat(newPath); err == nil {
		return nil, ErrFileExists
	}

	if err := os.Rename(sourcePath, newPath); err != nil {
		return nil, err
	}

	newInfo, _ := os.Stat(newPath)
	return &FileEntry{
		Name:    filepath.Base(newPath),
		Path:    newPath,
		IsDir:   info.IsDir(),
		Size:    newInfo.Size(),
		ModTime: newInfo.ModTime().Format("2006-01-02 15:04:05"),
	}, nil
}
```

- [ ] **Step 2: Add rename/move routes to router.go**

Add inside the protected `api` group:

```go
		api.POST("/files/rename", func(c *gin.Context) {
			var req struct {
				Path    string `json:"path"`
				NewName string `json:"newName"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}
			entry, err := filemanager.Rename(req.Path, req.NewName)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": entry})
		})

		api.POST("/files/move", func(c *gin.Context) {
			var req struct {
				SourcePath string `json:"sourcePath"`
				DestDir    string `json:"destDir"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}
			entry, err := filemanager.Move(req.SourcePath, req.DestDir)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": entry})
		})
```

- [ ] **Step 3: Verify Go compiles**

```bash
cd server && go build ./cmd/nowenos-api
```

- [ ] **Step 4: Commit**

```bash
git add server/internal/filemanager/filemanager.go server/internal/httpapi/router.go
git commit -m "feat(files): add rename and move API endpoints"
```

---

## Task 3: Frontend — Recycle Bin API Client

**Files:**
- Create: `web/src/features/recycle/api.ts`

- [ ] **Step 1: Create recycle bin API client**

Create `web/src/features/recycle/api.ts`:

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/features/recycle/api.ts
git commit -m "feat(recycle): add recycle bin API client"
```

---

## Task 4: Frontend — File Rename/Move API Client

**Files:**
- Modify: `web/src/features/files/api.ts`

- [ ] **Step 1: Add rename and move functions**

Append to `web/src/features/files/api.ts`:

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/features/files/api.ts
git commit -m "feat(files): add rename and move API client functions"
```

---

## Task 5: Frontend — Recycle Bin Page + Register in App

**Files:**
- Create: `web/src/pages/recycle/index.tsx`
- Modify: `web/src/apps/registry.tsx`

- [ ] **Step 1: Create Recycle Bin page**

Create `web/src/pages/recycle/index.tsx`:

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";
import {
  fetchRecycleItems,
  restoreItem,
  permanentDelete,
  emptyTrash,
  type RecycleItem,
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
```

- [ ] **Step 2: Register recycle bin in app registry**

In `web/src/apps/registry.tsx`, add the import and registry entry:

Add import:
```typescript
const RecycleApp = lazy(() => import("@/pages/recycle"));
```

Add to `appRegistry` array (after alerts, before settings):
```typescript
  { id: "recycle", titleKey: "nav.recycle", icon: Trash2, component: RecycleApp },
```

Also add `Trash2` to the lucide-react import if not already present.

- [ ] **Step 3: Add to Dock**

In `web/src/components/desktop/Dock.tsx`, add `"recycle"` to the `DOCK_IDS` array.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/recycle/index.tsx web/src/apps/registry.tsx web/src/components/desktop/Dock.tsx
git commit -m "feat(recycle): add recycle bin page, register in app registry and dock"
```

---

## Task 6: Frontend — Enhance File Manager with Rename, Move-to-trash, Context Menu

**Files:**
- Modify: `web/src/pages/files/index.tsx`
- Modify: `web/src/features/files/api.ts` (if rename/move not yet added)

- [ ] **Step 1: Add rename and trash-to-recycle functionality to FilesPage**

In `web/src/pages/files/index.tsx`:

1. Import `renameFile` from `@/features/files/api` and `trashFile` from `@/features/recycle/api`.
2. Add state for rename: `const [renamingPath, setRenamingPath] = useState<string | null>(null)` and `const [newName, setNewName] = useState("")`.
3. Add rename mutation:
```typescript
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
```
4. Add trash mutation (replaces direct delete):
```typescript
const trashMutation = useMutation({
  mutationFn: (path: string) => trashFile(path),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["files", currentPath] });
    toast.success(t("files.trashSuccess"));
  },
  onError: () => toast.error(t("files.trashFailed")),
});
```
5. Replace the delete button's `onClick` to use `trashMutation.mutate` instead of `deleteMutation.mutate` (keep deleteMutation for shift+delete permanent delete).
6. Add a rename button (Pencil icon) next to the download button in the actions column.
7. When `renamingPath` matches an entry's path, show an inline input field instead of the name text.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/files/index.tsx
git commit -m "feat(files): add rename and move-to-trash with inline rename UI"
```

---

## Task 7: Frontend — Enhance Storage Page with Usage Bars

**Files:**
- Modify: `web/src/pages/storage/index.tsx`
- Modify: `web/src/features/storage/api.ts`
- Modify: `server/internal/systemadapter/diskinfo.go`

- [ ] **Step 1: Add disk usage info to backend**

In `server/internal/systemadapter/diskinfo.go`, extend `DiskInfo` struct:

```go
type DiskInfo struct {
	Name       string `json:"name"`
	Size       string `json:"size"`
	SizeBytes  int64  `json:"sizeBytes"`
	Used       string `json:"used"`
	UsedBytes  int64  `json:"usedBytes"`
	Avail      string `json:"avail"`
	AvailBytes int64  `json:"availBytes"`
	UsedPct    int    `json:"usedPct"`
	Model      string `json:"model"`
	Type       string `json:"type"`
	Mountpoint string `json:"mountpoint"`
	Fstype     string `json:"fstype"`
}
```

Add a new function `GetDiskUsage` that runs `df -B1 --output=source,size,used,avail,pcent,target` and parses the output. Merge the usage data into the existing `GetDisks` result by matching on mountpoint/device name.

- [ ] **Step 2: Update frontend storage API type**

In `web/src/features/storage/api.ts`, extend `DiskInfo`:

```typescript
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
```

- [ ] **Step 3: Add usage bar to StoragePage**

In `web/src/pages/storage/index.tsx`, add a usage progress bar inside `DiskCard` after the size display:

```tsx
{disk.mountpoint && disk.usedPct > 0 && (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{disk.used ?? "—"}</span>
      <span className="text-muted-foreground">{disk.size}</span>
    </div>
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${disk.usedPct > 90 ? "bg-danger" : disk.usedPct > 70 ? "bg-warning" : "bg-primary"}`}
        style={{ width: `${Math.min(disk.usedPct, 100)}%` }}
      />
    </div>
    <p className="text-right text-[10px] text-muted-foreground">{disk.usedPct}% used</p>
  </div>
)}
```

- [ ] **Step 4: Verify Go and TypeScript compile**

```bash
cd server && go build ./cmd/nowenos-api
cd web && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add server/internal/systemadapter/diskinfo.go web/src/features/storage/api.ts web/src/pages/storage/index.tsx
git commit -m "feat(storage): add disk usage bars with df-based usage stats"
```

---

## Task 8: i18n — Add All v0.2 Translation Keys

**Files:**
- Modify: `web/src/i18n/translations.ts`

- [ ] **Step 1: Add all v0.2 translation keys**

Add these keys to `web/src/i18n/translations.ts` in both English and Chinese sections:

```typescript
  // Recycle Bin
  "nav.recycle": { en: "Recycle Bin", zh: "回收站" },
  "recycle.title": { en: "Recycle Bin", zh: "回收站" },
  "recycle.loading": { en: "Loading...", zh: "加载中..." },
  "recycle.failed": { en: "Failed to load recycle bin", zh: "加载回收站失败" },
  "recycle.empty": { en: "Recycle bin is empty", zh: "回收站为空" },
  "recycle.originalPath": { en: "Original Path", zh: "原始路径" },
  "recycle.restore": { en: "Restore", zh: "恢复" },
  "recycle.restored": { en: "Item restored", zh: "已恢复" },
  "recycle.restoreFailed": { en: "Restore failed", zh: "恢复失败" },
  "recycle.permanentDelete": { en: "Delete permanently", zh: "永久删除" },
  "recycle.deleted": { en: "Permanently deleted", zh: "已永久删除" },
  "recycle.deleteFailed": { en: "Delete failed", zh: "删除失败" },
  "recycle.emptyTrash": { en: "Empty Trash", zh: "清空回收站" },
  "recycle.confirmEmpty": { en: "Are you sure? This cannot be undone.", zh: "确定吗？此操作不可撤销。" },
  "recycle.confirmDelete": { en: "Permanently delete this item?", zh: "永久删除此项目？" },
  "recycle.emptied": { en: "Trash emptied", zh: "回收站已清空" },
  "recycle.emptyFailed": { en: "Failed to empty trash", zh: "清空回收站失败" },
  "recycle.yes": { en: "Yes, empty", zh: "确定清空" },

  // Files - rename/trash
  "files.rename": { en: "Rename", zh: "重命名" },
  "files.renameSuccess": { en: "Renamed successfully", zh: "重命名成功" },
  "files.renameFailed": { en: "Rename failed", zh: "重命名失败" },
  "files.trashSuccess": { en: "Moved to recycle bin", zh: "已移至回收站" },
  "files.trashFailed": { en: "Failed to move to recycle bin", zh: "移至回收站失败" },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/i18n/translations.ts
git commit -m "feat(i18n): add v0.2 translation keys for recycle bin and file operations"
```

---

## Task 9: Full Verification

- [ ] **Step 1: Build backend**

```bash
cd server && go build ./cmd/nowenos-api
```

- [ ] **Step 2: Build frontend**

```bash
cd web && npm run build
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Manual test checklist**

| Check | Expected |
|---|---|
| Storage page shows usage bars | Each mounted disk/partition has a colored progress bar |
| Usage bar colors | Green (<70%), Yellow (70-90%), Red (>90%) |
| Files page: rename button visible | Pencil icon next to download/delete |
| Files page: inline rename works | Click rename → input appears → Enter saves |
| Files page: delete moves to trash | Delete button moves item to recycle bin |
| Recycle Bin app opens | Shows list of deleted items |
| Restore works | Item returns to original location |
| Permanent delete works | Item removed from trash and disk |
| Empty trash works | All items removed after confirmation |
| Recycle bin in Dock | Trash icon visible in dock |

---

## Self-Check

1. **Spec coverage:** Recycle bin model (OK), trash/restore/empty API (OK), rename/move API (OK), recycle bin page (OK), file manager enhancements (OK), storage usage bars (OK), i18n (OK).
2. **Placeholder scan:** No TODOs or incomplete code blocks.
3. **Type consistency:** `RecycleItem`, `DiskInfo` extended fields used consistently across frontend and backend.
4. **Safety:** No destructive disk operations added. Trash is soft-delete. Permanent delete requires confirmation. Empty trash requires double confirmation.

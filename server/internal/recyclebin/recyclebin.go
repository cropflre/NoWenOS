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

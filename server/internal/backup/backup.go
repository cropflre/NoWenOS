package backup

import (
	"archive/tar"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"time"
)

const (
	BackupDir = "/var/lib/nowenos/backups"
	DBPath    = "data/nowenos.db"
	ConfigDir = "/etc/nowenos"
)

// BackupInfo holds metadata about a single backup file.
type BackupInfo struct {
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	Size      int64     `json:"size"`
	CreatedAt time.Time `json:"createdAt"`
}

// InitBackupDir ensures the backup storage directory exists.
func InitBackupDir() error {
	return os.MkdirAll(BackupDir, 0755)
}

// CreateBackup creates a tar.gz archive of the database and config directory.
func CreateBackup() (string, error) {
	if err := InitBackupDir(); err != nil {
		return "", fmt.Errorf("create backup dir: %w", err)
	}

	timestamp := time.Now().Format("20060102-150405")
	fileName := fmt.Sprintf("nowenos-backup-%s.tar.gz", timestamp)
	outPath := filepath.Join(BackupDir, fileName)

	outFile, err := os.Create(outPath)
	if err != nil {
		return "", fmt.Errorf("create backup file: %w", err)
	}
	defer outFile.Close()

	gw := gzip.NewWriter(outFile)
	defer gw.Close()

	tw := tar.NewWriter(gw)
	defer tw.Close()

	// Add database file
	if err := addFileToTar(tw, DBPath); err != nil {
		// DB might not exist yet; log but don't fail
		fmt.Printf("warning: could not add database to backup: %v\n", err)
	}

	// Add config directory
	if err := addDirToTar(tw, ConfigDir, ConfigDir); err != nil {
		if os.IsNotExist(err) {
			fmt.Printf("warning: config dir %s does not exist, skipping\n", ConfigDir)
		} else {
			return "", fmt.Errorf("add config dir: %w", err)
		}
	}

	if err := tw.Close(); err != nil {
		return "", fmt.Errorf("close tar writer: %w", err)
	}
	if err := gw.Close(); err != nil {
		return "", fmt.Errorf("close gzip writer: %w", err)
	}

	return outPath, nil
}

// ListBackups returns metadata for all backup files sorted by creation time (newest first).
func ListBackups() ([]BackupInfo, error) {
	if err := InitBackupDir(); err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(BackupDir)
	if err != nil {
		return nil, fmt.Errorf("read backup dir: %w", err)
	}

	var backups []BackupInfo
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		backups = append(backups, BackupInfo{
			Name:      e.Name(),
			Path:      filepath.Join(BackupDir, e.Name()),
			Size:      info.Size(),
			CreatedAt: info.ModTime(),
		})
	}

	sort.Slice(backups, func(i, j int) bool {
		return backups[i].CreatedAt.After(backups[j].CreatedAt)
	})

	return backups, nil
}

// RestoreBackup extracts the given backup archive, overwriting current data.
func RestoreBackup(filePath string) error {
	f, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("open backup file: %w", err)
	}
	defer f.Close()

	gz, err := gzip.NewReader(f)
	if err != nil {
		return fmt.Errorf("open gzip reader: %w", err)
	}
	defer gz.Close()

	tr := tar.NewReader(gz)

	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("read tar entry: %w", err)
		}

		// Determine the target path. Backup stores paths relative to root
		// for config (e.g. "/etc/nowenos/foo") and relative for DB ("data/nowenos.db").
		target := header.Name

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, os.FileMode(header.Mode)); err != nil {
				return fmt.Errorf("mkdir %s: %w", target, err)
			}
		case tar.TypeReg:
			dir := filepath.Dir(target)
			if err := os.MkdirAll(dir, 0755); err != nil {
				return fmt.Errorf("mkdir %s: %w", dir, err)
			}
			outFile, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				return fmt.Errorf("create file %s: %w", target, err)
			}
			if _, err := io.Copy(outFile, tr); err != nil {
				outFile.Close()
				return fmt.Errorf("write file %s: %w", target, err)
			}
			outFile.Close()
		}
	}

	return nil
}

// DeleteBackup removes a backup file by name (safe-path checked).
func DeleteBackup(name string) error {
	filePath := filepath.Join(BackupDir, filepath.Base(name))

	// Ensure the resolved path is still inside BackupDir
	absBackup, _ := filepath.Abs(BackupDir)
	absFile, _ := filepath.Abs(filePath)
	if filepath.Dir(absFile) != absBackup {
		return fmt.Errorf("invalid backup path")
	}

	if err := os.Remove(filePath); err != nil {
		return fmt.Errorf("delete backup: %w", err)
	}
	return nil
}

// addFileToTar adds a single file to the tar writer.
func addFileToTar(tw *tar.Writer, path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}

	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	header := &tar.Header{
		Name:    path,
		Size:    info.Size(),
		Mode:    int64(info.Mode()),
		ModTime: info.ModTime(),
	}

	if err := tw.WriteHeader(header); err != nil {
		return err
	}

	_, err = io.Copy(tw, f)
	return err
}

// addDirToTar recursively adds a directory to the tar writer.
func addDirToTar(tw *tar.Writer, root, base string) error {
	return filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		header, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return err
		}
		header.Name = path

		if err := tw.WriteHeader(header); err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()

		_, err = io.Copy(tw, f)
		return err
	})
}

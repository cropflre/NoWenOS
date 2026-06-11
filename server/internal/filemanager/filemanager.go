package filemanager

import (
	"archive/tar"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

var (
	ErrPathRequired  = errors.New("path is required")
	ErrPathNotFound  = errors.New("path not found")
	ErrNotDirectory  = errors.New("path is not a directory")
	ErrNotFile       = errors.New("path is not a file")
	ErrFileExists    = errors.New("file already exists")
	ErrDeleteFailed  = errors.New("delete failed")
)

type FileEntry struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
}

type BrowseResult struct {
	Path    string      `json:"path"`
	Parent  string      `json:"parent"`
	Entries []FileEntry `json:"entries"`
}

func Browse(dirPath string) (*BrowseResult, error) {
	if dirPath == "" {
		return nil, ErrPathRequired
	}

	dirPath = filepath.Clean(dirPath)

	info, err := os.Stat(dirPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrPathNotFound
		}
		return nil, err
	}

	if !info.IsDir() {
		return nil, ErrNotDirectory
	}

	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	files := make([]FileEntry, 0, len(entries))
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		files = append(files, FileEntry{
			Name:    entry.Name(),
			Path:    filepath.Join(dirPath, entry.Name()),
			IsDir:   entry.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime().Format("2006-01-02 15:04:05"),
		})
	}

	sort.Slice(files, func(i, j int) bool {
		if files[i].IsDir != files[j].IsDir {
			return files[i].IsDir
		}
		return strings.ToLower(files[i].Name) < strings.ToLower(files[j].Name)
	})

	parent := filepath.Dir(dirPath)
	if parent == dirPath {
		parent = ""
	}

	return &BrowseResult{
		Path:    dirPath,
		Parent:  parent,
		Entries: files,
	}, nil
}

func GetFileInfo(filePath string) (*FileEntry, error) {
	if filePath == "" {
		return nil, ErrPathRequired
	}

	filePath = filepath.Clean(filePath)

	info, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrPathNotFound
		}
		return nil, err
	}

	if info.IsDir() {
		return nil, ErrNotFile
	}

	return &FileEntry{
		Name:    info.Name(),
		Path:    filePath,
		IsDir:   false,
		Size:    info.Size(),
		ModTime: info.ModTime().Format("2006-01-02 15:04:05"),
	}, nil
}

func OpenFile(filePath string) (*os.File, error) {
	if filePath == "" {
		return nil, ErrPathRequired
	}

	filePath = filepath.Clean(filePath)

	info, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrPathNotFound
		}
		return nil, err
	}

	if info.IsDir() {
		return nil, ErrNotFile
	}

	return os.Open(filePath)
}

func Upload(dirPath string, filename string, reader io.Reader) (*FileEntry, error) {
	if dirPath == "" {
		return nil, ErrPathRequired
	}

	dirPath = filepath.Clean(dirPath)

	info, err := os.Stat(dirPath)
	if err != nil {
		return nil, ErrPathNotFound
	}

	if !info.IsDir() {
		return nil, ErrNotDirectory
	}

	filename = filepath.Base(filename)
	if filename == "." || filename == ".." {
		return nil, errors.New("invalid filename")
	}

	targetPath := filepath.Join(dirPath, filename)

	if _, err := os.Stat(targetPath); err == nil {
		return nil, ErrFileExists
	}

	dst, err := os.Create(targetPath)
	if err != nil {
		return nil, err
	}
	defer dst.Close()

	written, err := io.Copy(dst, reader)
	if err != nil {
		os.Remove(targetPath)
		return nil, err
	}

	dstInfo, err := os.Stat(targetPath)
	if err != nil {
		return nil, err
	}

	return &FileEntry{
		Name:    filename,
		Path:    targetPath,
		IsDir:   false,
		Size:    written,
		ModTime: dstInfo.ModTime().Format("2006-01-02 15:04:05"),
	}, nil
}

func Delete(targetPath string) error {
	if targetPath == "" {
		return ErrPathRequired
	}

	targetPath = filepath.Clean(targetPath)

	if targetPath == "/" || targetPath == "." || targetPath == ".." {
		return errors.New("cannot delete this path")
	}

	info, err := os.Stat(targetPath)
	if err != nil {
		return ErrPathNotFound
	}

	if info.IsDir() {
		return os.RemoveAll(targetPath)
	}

	return os.Remove(targetPath)
}

func CreateDir(parentPath, dirName string) (*FileEntry, error) {
	if parentPath == "" {
		return nil, ErrPathRequired
	}

	parentPath = filepath.Clean(parentPath)

	info, err := os.Stat(parentPath)
	if err != nil {
		return nil, ErrPathNotFound
	}

	if !info.IsDir() {
		return nil, ErrNotDirectory
	}

	dirName = filepath.Base(dirName)
	if dirName == "." || dirName == ".." {
		return nil, errors.New("invalid directory name")
	}

	newPath := filepath.Join(parentPath, dirName)

	if err := os.MkdirAll(newPath, 0755); err != nil {
		return nil, err
	}

	return &FileEntry{
		Name:    dirName,
		Path:    newPath,
		IsDir:   true,
		Size:    0,
		ModTime: "",
	}, nil
}

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

var ErrSearchLimitReached = errors.New("search result limit reached")

func SearchFiles(rootPath, query string) ([]FileEntry, error) {
	if rootPath == "" {
		return nil, ErrPathRequired
	}
	if query == "" {
		return nil, errors.New("search query is required")
	}

	rootPath = filepath.Clean(rootPath)
	info, err := os.Stat(rootPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrPathNotFound
		}
		return nil, err
	}
	if !info.IsDir() {
		return nil, ErrNotDirectory
	}

	query = strings.ToLower(query)
	results := make([]FileEntry, 0)
	limit := 100

	err = filepath.Walk(rootPath, func(path string, fi os.FileInfo, err error) error {
		if err != nil {
			return nil // skip entries we can't access
		}
		if strings.HasPrefix(fi.Name(), ".") {
			if fi.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if strings.Contains(strings.ToLower(fi.Name()), query) {
			results = append(results, FileEntry{
				Name:    fi.Name(),
				Path:    path,
				IsDir:   fi.IsDir(),
				Size:    fi.Size(),
				ModTime: fi.ModTime().Format("2006-01-02 15:04:05"),
			})
			if len(results) >= limit {
				return ErrSearchLimitReached
			}
		}
		return nil
	})
	if err != nil && !errors.Is(err, ErrSearchLimitReached) {
		return nil, err
	}

	sort.Slice(results, func(i, j int) bool {
		if results[i].IsDir != results[j].IsDir {
			return results[i].IsDir
		}
		return strings.ToLower(results[i].Name) < strings.ToLower(results[j].Name)
	})

	return results, nil
}

func CompressFiles(paths []string, destPath string) error {
	if len(paths) == 0 {
		return errors.New("at least one source path is required")
	}
	if destPath == "" {
		return ErrPathRequired
	}

	destPath = filepath.Clean(destPath)
	if !strings.HasSuffix(destPath, ".tar.gz") {
		return errors.New("destination must have .tar.gz extension")
	}

	// Validate all source paths exist
	for _, p := range paths {
		p = filepath.Clean(p)
		if _, err := os.Stat(p); err != nil {
			return fmt.Errorf("source path not found: %s", p)
		}
	}

	outFile, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("failed to create archive: %w", err)
	}
	defer outFile.Close()

	gw := gzip.NewWriter(outFile)
	defer gw.Close()

	tw := tar.NewWriter(gw)
	defer tw.Close()

	for _, srcPath := range paths {
		srcPath = filepath.Clean(srcPath)
		baseName := filepath.Base(srcPath)

		err := filepath.Walk(srcPath, func(fullPath string, fi os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			// Build the name relative to the parent of srcPath
			relPath, err := filepath.Rel(filepath.Dir(srcPath), fullPath)
			if err != nil {
				return err
			}

			header, err := tar.FileInfoHeader(fi, "")
			if err != nil {
				return err
			}
			header.Name = relPath

			if fi.Mode().IsDir() {
				header.Name += "/"
			}

			if err := tw.WriteHeader(header); err != nil {
				return err
			}

			if !fi.Mode().IsRegular() {
				return nil
			}

			f, err := os.Open(fullPath)
			if err != nil {
				return err
			}
			defer f.Close()

			if _, err := io.Copy(tw, f); err != nil {
				return err
			}

			return nil
		})
		if err != nil {
			return fmt.Errorf("failed to archive %s: %w", baseName, err)
		}
	}

	return nil
}

func ExtractFile(archivePath, destDir string) error {
	if archivePath == "" || destDir == "" {
		return ErrPathRequired
	}

	archivePath = filepath.Clean(archivePath)
	destDir = filepath.Clean(destDir)

	if _, err := os.Stat(archivePath); err != nil {
		return ErrPathNotFound
	}

	// Ensure destination directory exists
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	f, err := os.Open(archivePath)
	if err != nil {
		return fmt.Errorf("failed to open archive: %w", err)
	}
	defer f.Close()

	gr, err := gzip.NewReader(f)
	if err != nil {
		return fmt.Errorf("failed to read gzip: %w", err)
	}
	defer gr.Close()

	tr := tar.NewReader(gr)
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to read tar entry: %w", err)
		}

		target := filepath.Join(destDir, header.Name)

		// Prevent path traversal
		if !strings.HasPrefix(filepath.Clean(target), filepath.Clean(destDir)) {
			return fmt.Errorf("invalid archive entry: %s", header.Name)
		}

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, os.FileMode(header.Mode)); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return err
			}
			outFile, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				return err
			}
			if _, err := io.Copy(outFile, tr); err != nil {
				outFile.Close()
				return err
			}
			outFile.Close()
		}
	}

	return nil
}
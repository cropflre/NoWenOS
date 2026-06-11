package httpapi

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"nowenos-server/internal/auth"
	"nowenos-server/internal/filemanager"
	"nowenos-server/internal/logviewer"
	"nowenos-server/internal/recyclebin"
	"nowenos-server/internal/settings"
	"nowenos-server/internal/sysinfo"
	"nowenos-server/internal/alerts"
	"nowenos-server/internal/shares"
	"nowenos-server/internal/systemadapter"
)

func New() *gin.Engine {
	r := gin.Default()

	r.GET("/api/v1/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.POST("/api/v1/auth/login", func(c *gin.Context) {
		var req auth.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}

		resp, err := auth.Login(req)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"data": resp})
	})

	// Protected routes
	api := r.Group("/api/v1")
	api.Use(authMiddleware())
	{
		api.GET("/system/info", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"name": "NoWenOS", "version": "0.1.0"}})
		})

		api.GET("/system/stats", func(c *gin.Context) {
			stats, err := sysinfo.GetStats()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": stats})
		})

		api.GET("/system/network", func(c *gin.Context) {
			stats, err := sysinfo.GetNetworkStats()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": stats})
		})

		api.GET("/system/hardware", func(c *gin.Context) {
			info, err := sysinfo.GetHardwareInfo()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": info})
		})
		api.GET("/system/processes", func(c *gin.Context) {
			limitStr := c.DefaultQuery("limit", "50")
			limit, _ := strconv.Atoi(limitStr)

			procs, err := sysinfo.GetTopProcesses(limit)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": procs})
		})

		api.GET("/storage/disks", func(c *gin.Context) {
			disks, err := systemadapter.GetDisks()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": disks})
		})

		// ── Docker Containers ──
		api.GET("/docker/containers", func(c *gin.Context) {
			containers, err := systemadapter.GetContainers()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": containers})
		})

		api.POST("/docker/containers/:id/control", func(c *gin.Context) {
			id := c.Param("id")
			var req struct {
				Action string `json:"action"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}

			if err := systemadapter.ControlContainer(id, req.Action); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok", "action": req.Action}})
		})

		api.GET("/docker/containers/:id/logs", func(c *gin.Context) {
			id := c.Param("id")
			tailStr := c.DefaultQuery("tail", "100")
			tail, _ := strconv.Atoi(tailStr)

			logs, err := systemadapter.GetContainerLogs(id, tail)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": gin.H{"logs": logs}})
		})

		// ── Docker Images ──
		api.GET("/docker/images", func(c *gin.Context) {
			images, err := systemadapter.GetImages()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": images})
		})

		api.POST("/docker/images/pull", func(c *gin.Context) {
			var req struct {
				Image string `json:"image"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}

			if err := systemadapter.PullImage(req.Image); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok", "image": req.Image}})
		})

		api.DELETE("/docker/images/:id", func(c *gin.Context) {
			id := c.Param("id")

			if err := systemadapter.RemoveImage(id); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok"}})
		})

		// ── Docker Compose ──
		api.GET("/docker/compose", func(c *gin.Context) {
			projects, err := systemadapter.ListComposeProjects()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": projects})
		})

		api.GET("/docker/compose/:name", func(c *gin.Context) {
			name := c.Param("name")
			services, err := systemadapter.GetComposeProject(name)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": services})
		})

		api.POST("/docker/compose/:name/control", func(c *gin.Context) {
			name := c.Param("name")
			var req struct {
				Action   string `json:"action"`
				FilePath string `json:"filePath"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}

			var err error
			switch req.Action {
			case "up":
				err = systemadapter.ComposeUp(name, req.FilePath)
			case "down":
				err = systemadapter.ComposeDown(name, req.FilePath)
			case "restart":
				err = systemadapter.ComposeRestart(name, req.FilePath)
			default:
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid action. Use up, down, or restart"})
				return
			}

			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok", "action": req.Action}})
		})

		api.GET("/docker/compose/:name/logs", func(c *gin.Context) {
			name := c.Param("name")
			tailStr := c.DefaultQuery("tail", "100")
			tail, _ := strconv.Atoi(tailStr)

			logs, err := systemadapter.ComposeLogs(name, tail)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": gin.H{"logs": logs}})
		})

		// ── Docker Compose File Editor ──
		api.GET("/docker/compose/file", func(c *gin.Context) {
			path := c.Query("path")
			content, err := systemadapter.ReadComposeFile(path)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"path": path, "content": content}})
		})

		api.PUT("/docker/compose/file", func(c *gin.Context) {
			var req struct {
				Path    string `json:"path"`
				Content string `json:"content"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}
			if err := systemadapter.WriteComposeFile(req.Path, req.Content); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok", "path": req.Path}})
		})

		api.POST("/docker/compose/file/validate", func(c *gin.Context) {
			var req struct {
				Path string `json:"path"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}
			output, err := systemadapter.ValidateComposeFile(req.Path)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "output": output})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "valid", "output": output}})
		})

		api.POST("/docker/compose/file/deploy", func(c *gin.Context) {
			var req struct {
				Path string `json:"path"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}
			if err := systemadapter.DeployComposeFile(req.Path); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "deployed"}})
		})

		// ── Alerts ──
		api.GET("/alerts/rules", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"data": alerts.GetRules()})
		})

		api.POST("/alerts/rules", func(c *gin.Context) {
			var req alerts.CreateRuleRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}
			rule, err := alerts.CreateRule(req)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": rule})
		})

		api.PUT("/alerts/rules/:id/toggle", func(c *gin.Context) {
			var id int64
			fmt.Sscanf(c.Param("id"), "%d", &id)
			var req struct {
				Enabled bool `json:"enabled"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}
			if err := alerts.ToggleRule(id, req.Enabled); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok"}})
		})

		api.DELETE("/alerts/rules/:id", func(c *gin.Context) {
			var id int64
			fmt.Sscanf(c.Param("id"), "%d", &id)
			if err := alerts.DeleteRule(id); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok"}})
		})

		api.GET("/alerts/events", func(c *gin.Context) {
			limitStr := c.DefaultQuery("limit", "50")
			limit, _ := strconv.Atoi(limitStr)
			events := alerts.GetEvents(limit)
			unseen := alerts.GetUnseenCount()
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"events": events, "unseen": unseen}})
		})

		api.POST("/alerts/events/seen", func(c *gin.Context) {
			alerts.MarkAllSeen()
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok"}})
		})

		api.DELETE("/alerts/events", func(c *gin.Context) {
			alerts.ClearEvents()
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok"}})
		})

		// ── Shares ──
		api.GET("/shares", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"data": shares.GetShares()})
		})

		api.GET("/shares/status", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"data": shares.GetSambaStatus()})
		})

		api.GET("/shares/status/webdav", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"data": shares.GetWebDAVStatus()})
		})

		api.GET("/shares/status/nfs", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"data": shares.GetNFSStatus()})
		})

		api.POST("/shares", func(c *gin.Context) {
			var req shares.CreateShareRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}
			share, err := shares.CreateShare(req)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": share})
		})

		api.PUT("/shares/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			var id int64
			fmt.Sscanf(idStr, "%d", &id)
			var req shares.CreateShareRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}
			share, err := shares.UpdateShare(id, req)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": share})
		})

		api.PUT("/shares/:id/toggle", func(c *gin.Context) {
			idStr := c.Param("id")
			var id int64
			fmt.Sscanf(idStr, "%d", &id)
			var req struct {
				Enabled bool `json:"enabled"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}
			if err := shares.ToggleShare(id, req.Enabled); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok"}})
		})

		api.DELETE("/shares/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			var id int64
			fmt.Sscanf(idStr, "%d", &id)
			if err := shares.DeleteShare(id); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok"}})
		})

		// ── Files ──
		api.GET("/files/browse", func(c *gin.Context) {
			dirPath := c.Query("path")
			if dirPath == "" {
				dirPath = "."
			}

			result, err := filemanager.Browse(dirPath)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": result})
		})

		api.GET("/files/download", func(c *gin.Context) {
			filePath := c.Query("path")
			if filePath == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Path required"})
				return
			}

			file, err := filemanager.OpenFile(filePath)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			defer file.Close()

			info, err := filemanager.GetFileInfo(filePath)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.Header("Content-Disposition", "attachment; filename="+info.Name)
			c.Header("Content-Type", "application/octet-stream")
			c.Header("Content-Length", strconv.FormatInt(info.Size, 10))
			c.File(filePath)
		})

		api.POST("/files/upload", func(c *gin.Context) {
			dirPath := c.Query("path")
			if dirPath == "" {
				dirPath = "."
			}

			file, header, err := c.Request.FormFile("file")
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
				return
			}
			defer file.Close()

			entry, err := filemanager.Upload(dirPath, header.Filename, file)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": entry})
		})

		api.DELETE("/files/delete", func(c *gin.Context) {
			targetPath := c.Query("path")
			if targetPath == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Path required"})
				return
			}

			if err := filemanager.Delete(targetPath); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok"}})
		})

		api.POST("/files/mkdir", func(c *gin.Context) {
			var req struct {
				ParentPath string `json:"parentPath"`
				DirName    string `json:"dirName"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}

			entry, err := filemanager.CreateDir(req.ParentPath, req.DirName)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": entry})
		})

				// ── Recycle Bin ──
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

		// ── File Rename / Move ──
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

		// ── Users ──
		api.GET("/users", func(c *gin.Context) {
			users := auth.GetUsers()
			c.JSON(http.StatusOK, gin.H{"data": users})
		})

		api.POST("/users", func(c *gin.Context) {
			var req auth.CreateUserRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}

			user, err := auth.CreateUser(req)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": user})
		})

		api.DELETE("/users/:username", func(c *gin.Context) {
			username := c.Param("username")

			if err := auth.DeleteUser(username); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok"}})
		})

		api.PUT("/users/:username/password", func(c *gin.Context) {
			username := c.Param("username")
			var req auth.ChangePasswordRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}

			if err := auth.ChangePassword(username, req); err != nil {
				if err == auth.ErrInvalidCredentials {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
					return
				}
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok"}})
		})

		// ── Logs ──
		// ── Logs ──
		api.GET("/logs", func(c *gin.Context) {
			source := c.Query("source")
			limitStr := c.DefaultQuery("limit", "100")
			limit, _ := strconv.Atoi(limitStr)

			result, err := logviewer.GetLogs(source, limit)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": result})
		})

		api.GET("/logs/sources", func(c *gin.Context) {
			sources := logviewer.GetAvailableLogs()
			c.JSON(http.StatusOK, gin.H{"data": sources})
		})

		// ── Settings ──
		api.GET("/settings", func(c *gin.Context) {
			s := settings.Get()
			c.JSON(http.StatusOK, gin.H{"data": s})
		})

		api.PUT("/settings", func(c *gin.Context) {
			var req settings.Settings
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}

			if err := settings.Update(&req); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": settings.Get()})
		})
	}

	return r
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		token := parts[1]
		if !auth.ValidateToken(token) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Next()
	}
}



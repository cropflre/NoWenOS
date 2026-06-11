package audit

import (
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"nowenos-server/internal/database"
)

type AuditEntry struct {
	ID         int64  `json:"id"`
	Timestamp  string `json:"timestamp"`
	Username   string `json:"username"`
	Action     string `json:"action"`
	Resource   string `json:"resource"`
	ResourceID string `json:"resourceId"`
	Details    string `json:"details"`
	IP         string `json:"ip"`
	Status     string `json:"status"`
	Duration   int64  `json:"duration"`
}

func InitTable() {
	db := database.GetDB()
	db.Exec(`CREATE TABLE IF NOT EXISTS audit_log (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		username TEXT DEFAULT '',
		action TEXT NOT NULL,
		resource TEXT DEFAULT '',
		resource_id TEXT DEFAULT '',
		details TEXT DEFAULT '',
		ip TEXT DEFAULT '',
		status TEXT DEFAULT 'ok',
		duration INTEGER DEFAULT 0
	)`)
}

func Log(username, action, resource, resourceID, details, ip, status string, duration int64) {
	db := database.GetDB()
	db.Exec(
		"INSERT INTO audit_log (username, action, resource, resource_id, details, ip, status, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		username, action, resource, resourceID, details, ip, status, duration,
	)
}

func AuditMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		duration := time.Since(start).Milliseconds()

		method := c.Request.Method
		if method != "POST" && method != "PUT" && method != "DELETE" && method != "PATCH" {
			return
		}

		username, _ := c.Get("username")
		usernameStr := fmt.Sprintf("%v", username)

		path := c.Request.URL.Path
		resource := ""
		resourceID := ""

		// Extract resource from path: /api/v1/files/rename -> files
		parts := strings.Split(path, "/")
		if len(parts) >= 4 {
			resource = parts[3] // after /api/v1/
		}
		if len(parts) >= 5 {
			resourceID = parts[4]
		}

		status := "ok"
		if c.Writer.Status() >= 400 {
			status = "error"
		}

		ip := c.ClientIP()

		Log(usernameStr, method, resource, resourceID, path, ip, status, duration)
	}
}

func GetLogs(limit int, action, username string) []AuditEntry {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	db := database.GetDB()

	query := "SELECT id, timestamp, username, action, resource, resource_id, details, ip, status, duration FROM audit_log WHERE 1=1"
	args := []interface{}{}

	if action != "" {
		query += " AND action = ?"
		args = append(args, action)
	}
	if username != "" {
		query += " AND username = ?"
		args = append(args, username)
	}

	query += " ORDER BY id DESC LIMIT ?"
	args = append(args, limit)

	rows, err := db.Query(query, args...)
	if err != nil {
		return []AuditEntry{}
	}
	defer rows.Close()

	entries := make([]AuditEntry, 0)
	for rows.Next() {
		var e AuditEntry
		if err := rows.Scan(&e.ID, &e.Timestamp, &e.Username, &e.Action, &e.Resource, &e.ResourceID, &e.Details, &e.IP, &e.Status, &e.Duration); err != nil {
			continue
		}
		entries = append(entries, e)
	}
	return entries
}

func GetStats() map[string]interface{} {
	db := database.GetDB()

	var total int
	db.QueryRow("SELECT COUNT(*) FROM audit_log").Scan(&total)

	// By action
	actionRows, _ := db.Query("SELECT action, COUNT(*) as cnt FROM audit_log GROUP BY action ORDER BY cnt DESC")
	defer actionRows.Close()
	byAction := make(map[string]int)
	for actionRows.Next() {
		var action string
		var cnt int
		if actionRows.Scan(&action, &cnt) == nil {
			byAction[action] = cnt
		}
	}

	// By user
	userRows, _ := db.Query("SELECT username, COUNT(*) as cnt FROM audit_log GROUP BY username ORDER BY cnt DESC LIMIT 10")
	defer userRows.Close()
	byUser := make(map[string]int)
	for userRows.Next() {
		var user string
		var cnt int
		if userRows.Scan(&user, &cnt) == nil {
			byUser[user] = cnt
		}
	}

	// Recent 24h
	var recent24h int
	db.QueryRow("SELECT COUNT(*) FROM audit_log WHERE timestamp > datetime('now', '-24 hours')").Scan(&recent24h)

	return map[string]interface{}{
		"total":     total,
		"byAction":  byAction,
		"byUser":    byUser,
		"recent24h": recent24h,
	}
}

func ClearOld(days int) error {
	db := database.GetDB()
	_, err := db.Exec("DELETE FROM audit_log WHERE timestamp < datetime('now', ?)", fmt.Sprintf("-%d days", days))
	return err
}

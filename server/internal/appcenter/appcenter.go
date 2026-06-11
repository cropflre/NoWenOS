package appcenter

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"

	"nowenos-server/internal/database"
)

type AppTemplate struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Icon        string   `json:"icon"`
	Category    string   `json:"category"`
	Image       string   `json:"image"`
	Ports       []string `json:"ports"`
	Volumes     []string `json:"volumes"`
	EnvVars     []EnvVar `json:"envVars"`
	Installed   bool     `json:"installed"`
}

type EnvVar struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Default     string `json:"default"`
	Required    bool   `json:"required"`
}

func InitTable() {
	db := database.GetDB()
	db.Exec("CREATE TABLE IF NOT EXISTS installed_apps (" +
		"id TEXT PRIMARY KEY, " +
		"name TEXT NOT NULL, " +
		"container_id TEXT DEFAULT '', " +
		"status TEXT DEFAULT 'stopped', " +
		"installed_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
}

func GetBuiltinTemplates() []AppTemplate {
	return []AppTemplate{
		{ID: "nginx", Name: "Nginx", Description: "High-performance web server", Icon: "globe", Category: "web", Image: "nginx:latest", Ports: []string{"8080:80"}, Volumes: []string{"nowenos-nginx-conf:/etc/nginx/conf.d"}},
		{ID: "portainer", Name: "Portainer", Description: "Docker management UI", Icon: "container", Category: "management", Image: "portainer/portainer-ce:latest", Ports: []string{"9000:9000"}, Volumes: []string{"/var/run/docker.sock:/var/run/docker.sock", "portainer-data:/data"}},
		{ID: "nextcloud", Name: "Nextcloud", Description: "File sync and share platform", Icon: "cloud", Category: "productivity", Image: "nextcloud:latest", Ports: []string{"8081:80"}, Volumes: []string{"nextcloud-data:/var/www/html"}},
		{ID: "pihole", Name: "Pi-hole", Description: "Network-wide ad blocker", Icon: "shield", Category: "network", Image: "pihole/pihole:latest", Ports: []string{"8053:53", "8082:80"}, EnvVars: []EnvVar{{Name: "WEBPASSWORD", Description: "Admin password", Required: true}}},
		{ID: "jellyfin", Name: "Jellyfin", Description: "Free media server", Icon: "film", Category: "media", Image: "jellyfin/jellyfin:latest", Ports: []string{"8096:8096"}, Volumes: []string{"jellyfin-config:/config", "jellyfin-cache:/cache"}},
		{ID: "homeassistant", Name: "Home Assistant", Description: "Home automation platform", Icon: "home", Category: "iot", Image: "ghcr.io/home-assistant/home-assistant:stable", Ports: []string{"8123:8123"}, Volumes: []string{"ha-config:/config"}},
	}
}

func GetInstalledApps() []map[string]interface{} {
	db := database.GetDB()
	rows, err := db.Query("SELECT id, name, container_id, status, installed_at FROM installed_apps ORDER BY installed_at DESC")
	if err != nil {
		return []map[string]interface{}{}
	}
	defer rows.Close()
	apps := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, name, cid, status, installedAt string
		if rows.Scan(&id, &name, &cid, &status, &installedAt) == nil {
			apps = append(apps, map[string]interface{}{
				"id": id, "name": name, "containerId": cid, "status": status, "installedAt": installedAt,
			})
		}
	}
	return apps
}

func InstallApp(templateID string, envOverrides map[string]string) error {
	templates := GetBuiltinTemplates()
	var tmpl *AppTemplate
	for _, t := range templates {
		if t.ID == templateID {
			tmpl = &t
			break
		}
	}
	if tmpl == nil {
		return errors.New("template not found")
	}

	db := database.GetDB()
	var count int
	db.QueryRow("SELECT COUNT(*) FROM installed_apps WHERE id = ?", templateID).Scan(&count)
	if count > 0 {
		return errors.New("app already installed")
	}

	// Generate docker-compose content
	compose := generateCompose(tmpl, envOverrides)
	composePath := filepath.Join("/var/lib/nowenos/apps", templateID)
	os.MkdirAll(composePath, 0755)
	os.WriteFile(filepath.Join(composePath, "docker-compose.yml"), []byte(compose), 0644)

	// TODO: Actually run docker compose up via systemadapter
	db.Exec("INSERT INTO installed_apps (id, name, status) VALUES (?, ?, ?)", templateID, tmpl.Name, "running")
	return nil
}

func UninstallApp(appID string) error {
	db := database.GetDB()
	result, err := db.Exec("DELETE FROM installed_apps WHERE id = ?", appID)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("app not found")
	}
	return nil
}

func generateCompose(tmpl *AppTemplate, env map[string]string) string {
	type Service struct {
		Image   string   `json:"image"`
		Ports   []string `json:"ports,omitempty"`
		Volumes []string `json:"volumes,omitempty"`
		Env     []string `json:"environment,omitempty"`
		Restart string   `json:"restart"`
	}
	type Compose struct {
		Version  string             `json:"version"`
		Services map[string]Service `json:"services"`
	}
	c := Compose{Version: "3", Services: map[string]Service{}}
	svc := Service{Image: tmpl.Image, Ports: tmpl.Ports, Volumes: tmpl.Volumes, Restart: "unless-stopped"}
	for _, ev := range tmpl.EnvVars {
		val := env[ev.Name]
		if val == "" {
			val = ev.Default
		}
		if val != "" {
			svc.Env = append(svc.Env, ev.Name+"="+val)
		}
	}
	c.Services[tmpl.ID] = svc
	out, _ := json.MarshalIndent(c, "", "  ")
	return string(out)
}

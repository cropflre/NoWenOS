package main

import (
	"log"
	"time"

	"nowenos-server/internal/alerts"
	"nowenos-server/internal/appcenter"
	"nowenos-server/internal/proxy"
	"nowenos-server/internal/statsstore"
	"nowenos-server/internal/ws"
	"nowenos-server/internal/audit"
	"nowenos-server/internal/auth"
	"nowenos-server/internal/config"
	"nowenos-server/internal/database"
	"nowenos-server/internal/httpapi"
	"nowenos-server/internal/tlsconfig"
	"nowenos-server/internal/recyclebin"
	"nowenos-server/internal/shares"
	"nowenos-server/internal/backup"
)

func main() {
	cfg := config.Load()

	// Initialize database
	database.GetDB()
	defer database.Close()

	// Initialize default users
	auth.InitDB()
	auth.InitGroupsTable()
	alerts.InitTable()
	shares.InitTable()
	backup.InitBackupDir()
	recyclebin.InitTable()
	audit.InitTable()
	appcenter.InitTable()
	proxy.InitTable()
	alerts.StartPeriodicCheck()
	statsstore.InitTable()
	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			statsstore.Cleanup(7)
		}
	}()
	ws.StartBroadcast()

	r := httpapi.New()

	tlsCfg := tlsconfig.Load()
	log.Printf("starting NoWenOS API on :%s", cfg.Port)
	if tlsCfg.Enabled {
		log.Printf("TLS enabled with cert=%s", tlsCfg.CertFile)
		if err := r.RunTLS(":"+cfg.Port, tlsCfg.CertFile, tlsCfg.KeyFile); err != nil {
			log.Fatal(err)
		}
	} else {
		if err := r.Run(":" + cfg.Port); err != nil {
			log.Fatal(err)
		}
	}
}


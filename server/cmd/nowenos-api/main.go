package main

import (
	"log"

	"nowenos-server/internal/auth"
	"nowenos-server/internal/config"
	"nowenos-server/internal/database"
	"nowenos-server/internal/httpapi"
	"nowenos-server/internal/recyclebin"
	"nowenos-server/internal/alerts"
	"nowenos-server/internal/shares"
)

func main() {
	cfg := config.Load()

	// Initialize database
	database.GetDB()
	defer database.Close()

	// Initialize default users
	auth.InitDB()
	alerts.InitTable()
	shares.InitTable()
	recyclebin.InitTable()
	alerts.StartPeriodicCheck()

	r := httpapi.New()

	log.Printf("starting NoWenOS API on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
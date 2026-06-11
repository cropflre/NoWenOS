package statsstore

import (
	"time"

	"nowenos-server/internal/database"
)

type StatsRecord struct {
	ID        int64   `json:"id"`
	CPU       float64 `json:"cpu"`
	Memory    float64 `json:"memory"`
	Disk      float64 `json:"disk"`
	RxBytes   int64   `json:"rxBytes"`
	TxBytes   int64   `json:"txBytes"`
	CreatedAt string  `json:"createdAt"`
}

// InitTable creates the stats_history table if it does not exist.
func InitTable() {
	db := database.GetDB()
	db.Exec(`CREATE TABLE IF NOT EXISTS stats_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		cpu REAL,
		memory REAL,
		disk REAL,
		rx_bytes INTEGER,
		tx_bytes INTEGER,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`)
}

// RecordStats inserts a new stats row.
func RecordStats(cpu, memory, disk float64, rxBytes, txBytes int64) {
	db := database.GetDB()
	db.Exec(
		`INSERT INTO stats_history (cpu, memory, disk, rx_bytes, tx_bytes) VALUES (?, ?, ?, ?, ?)`,
		cpu, memory, disk, rxBytes, txBytes,
	)
}

// GetHistory returns stats records from the last N minutes, ordered by created_at.
func GetHistory(minutes int) ([]StatsRecord, error) {
	db := database.GetDB()
	cutoff := time.Now().Add(-time.Duration(minutes) * time.Minute).UTC().Format("2006-01-02 15:04:05")

	rows, err := db.Query(
		`SELECT id, cpu, memory, disk, rx_bytes, tx_bytes, created_at
		 FROM stats_history
		 WHERE created_at >= ?
		 ORDER BY created_at ASC`,
		cutoff,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []StatsRecord
	for rows.Next() {
		var r StatsRecord
		if err := rows.Scan(&r.ID, &r.CPU, &r.Memory, &r.Disk, &r.RxBytes, &r.TxBytes, &r.CreatedAt); err != nil {
			continue
		}
		records = append(records, r)
	}
	return records, nil
}

// Cleanup deletes rows older than N days.
func Cleanup(olderThanDays int) {
	db := database.GetDB()
	cutoff := time.Now().AddDate(0, 0, -olderThanDays).UTC().Format("2006-01-02 15:04:05")
	db.Exec(`DELETE FROM stats_history WHERE created_at < ?`, cutoff)
}
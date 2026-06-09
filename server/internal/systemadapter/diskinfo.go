package systemadapter

import (
	"encoding/json"
	"fmt"
	"os/exec"
)

type DiskInfo struct {
	Name       string `json:"name"`
	Size       string `json:"size"`
	Model      string `json:"model"`
	Type       string `json:"type"`
	Mountpoint string `json:"mountpoint"`
	Fstype     string `json:"fstype"`
}

func GetDisks() ([]DiskInfo, error) {
	cmd := exec.Command("lsblk", "-bJo", "NAME,SIZE,MODEL,TYPE,MOUNTPOINT,FSTYPE")
	out, err := cmd.Output()
	if err != nil {
		return []DiskInfo{}, nil
	}

	var result struct {
		BlockDevices []struct {
			Name       string `json:"name"`
			Size       int64  `json:"size"`
			Model      string `json:"model"`
			Type       string `json:"type"`
			Mountpoint string `json:"mountpoint"`
			Fstype     string `json:"fstype"`
		} `json:"blockdevices"`
	}

	if err := json.Unmarshal(out, &result); err != nil {
		return []DiskInfo{}, nil
	}

	disks := make([]DiskInfo, 0, len(result.BlockDevices))
	for _, d := range result.BlockDevices {
		disks = append(disks, DiskInfo{
			Name:       d.Name,
			Size:       formatBytes(d.Size),
			Model:      d.Model,
			Type:       d.Type,
			Mountpoint: d.Mountpoint,
			Fstype:     d.Fstype,
		})
	}

	return disks, nil
}

func formatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return "0 B"
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	units := "KMGTPE"
	return fmt.Sprintf("%.1f %ciB", float64(b)/float64(div), units[exp])
}

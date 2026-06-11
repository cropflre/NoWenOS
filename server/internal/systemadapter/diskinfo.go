package systemadapter

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

type DiskInfo struct {
	Name       string `json:"name"`
	Size       string `json:"size"`
	SizeBytes  int64  `json:"sizeBytes"`
	Used       string `json:"used"`
	UsedBytes  int64  `json:"usedBytes"`
	Avail      string `json:"avail"`
	AvailBytes int64  `json:"availBytes"`
	UsedPct    int    `json:"usedPct"`
	Model      string `json:"model"`
	Type       string `json:"type"`
	Mountpoint string `json:"mountpoint"`
	Fstype     string `json:"fstype"`
}

type diskUsage struct {
	UsedBytes  int64
	AvailBytes int64
	UsedPct    int
}

func getDiskUsage() map[string]diskUsage {
	usage := make(map[string]diskUsage)
	cmd := exec.Command("df", "-B1", "--output=source,size,used,avail,pcent,target")
	out, err := cmd.Output()
	if err != nil {
		return usage
	}

	lines := strings.Split(string(out), "\n")
	for _, line := range lines[1:] {
		fields := strings.Fields(line)
		if len(fields) < 6 {
			continue
		}
		var sizeBytes, usedBytes, availBytes int64
		var pct int
		fmt.Sscanf(fields[1], "%d", &sizeBytes)
		fmt.Sscanf(fields[2], "%d", &usedBytes)
		fmt.Sscanf(fields[3], "%d", &availBytes)
		fmt.Sscanf(strings.TrimSuffix(fields[4], "%"), "%d", &pct)
		mountpoint := fields[5]
		usage[mountpoint] = diskUsage{
			UsedBytes:  usedBytes,
			AvailBytes: availBytes,
			UsedPct:    pct,
		}
	}
	return usage
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

	usage := getDiskUsage()

	disks := make([]DiskInfo, 0, len(result.BlockDevices))
	for _, d := range result.BlockDevices {
		disk := DiskInfo{
			Name:       d.Name,
			Size:       formatBytes(d.Size),
			SizeBytes:  d.Size,
			Model:      d.Model,
			Type:       d.Type,
			Mountpoint: d.Mountpoint,
			Fstype:     d.Fstype,
		}
		if u, ok := usage[d.Mountpoint]; ok && d.Mountpoint != "" {
			disk.Used = formatBytes(u.UsedBytes)
			disk.UsedBytes = u.UsedBytes
			disk.Avail = formatBytes(u.AvailBytes)
			disk.AvailBytes = u.AvailBytes
			disk.UsedPct = u.UsedPct
		}
		disks = append(disks, disk)
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
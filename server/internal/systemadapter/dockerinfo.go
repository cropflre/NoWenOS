package systemadapter

import (
	"encoding/json"
	"errors"
	"os/exec"
	"strconv"
)

type ContainerInfo struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Image string `json:"image"`
	State string `json:"state"`
}

type ImageInfo struct {
	ID         string `json:"id"`
	Repository string `json:"repository"`
	Tag        string `json:"tag"`
	Size       string `json:"size"`
	Created    string `json:"created"`
}

func GetContainers() ([]ContainerInfo, error) {
	cmd := exec.Command("docker", "ps", "-a", "--format", "{{json .}}")
	out, err := cmd.Output()
	if err != nil {
		return []ContainerInfo{}, nil
	}

	containers := make([]ContainerInfo, 0)
	lines := splitLines(out)
	for _, line := range lines {
		if line == "" {
			continue
		}
		var c struct {
			ID    string `json:"ID"`
			Names string `json:"Names"`
			Image string `json:"Image"`
			State string `json:"State"`
		}
		if err := json.Unmarshal([]byte(line), &c); err != nil {
			continue
		}
		containers = append(containers, ContainerInfo{
			ID:    c.ID,
			Name:  c.Names,
			Image: c.Image,
			State: c.State,
		})
	}

	return containers, nil
}

func GetImages() ([]ImageInfo, error) {
	cmd := exec.Command("docker", "images", "--format", "{{json .}}")
	out, err := cmd.Output()
	if err != nil {
		return []ImageInfo{}, nil
	}

	images := make([]ImageInfo, 0)
	lines := splitLines(out)
	for _, line := range lines {
		if line == "" {
			continue
		}
		var img struct {
			ID         string `json:"ID"`
			Repository string `json:"Repository"`
			Tag        string `json:"Tag"`
			Size       string `json:"Size"`
			CreatedAt  string `json:"CreatedAt"`
		}
		if err := json.Unmarshal([]byte(line), &img); err != nil {
			continue
		}
		images = append(images, ImageInfo{
			ID:         img.ID,
			Repository: img.Repository,
			Tag:        img.Tag,
			Size:       img.Size,
			Created:    img.CreatedAt,
		})
	}

	return images, nil
}

func PullImage(image string) error {
	if image == "" {
		return errors.New("image name is required")
	}

	cmd := exec.Command("docker", "pull", image)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return errors.New(string(out))
	}

	return nil
}

func RemoveImage(id string) error {
	if id == "" {
		return errors.New("image id is required")
	}

	cmd := exec.Command("docker", "rmi", id)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return errors.New(string(out))
	}

	return nil
}

var (
	ErrContainerNotFound = errors.New("container not found")
	ErrInvalidAction     = errors.New("invalid action")
)

func ControlContainer(id string, action string) error {
	if id == "" {
		return ErrContainerNotFound
	}

	var args []string
	switch action {
	case "start":
		args = []string{"start", id}
	case "stop":
		args = []string{"stop", id}
	case "restart":
		args = []string{"restart", id}
	default:
		return ErrInvalidAction
	}

	cmd := exec.Command("docker", args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return errors.New(string(out))
	}

	return nil
}

func GetContainerLogs(id string, tail int) (string, error) {
	if id == "" {
		return "", ErrContainerNotFound
	}

	if tail <= 0 || tail > 1000 {
		tail = 100
	}

	cmd := exec.Command("docker", "logs", "--tail", strconv.Itoa(tail), id)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", errors.New(string(out))
	}

	return string(out), nil
}

func splitLines(data []byte) []string {
	lines := make([]string, 0)
	start := 0
	for i, b := range data {
		if b == '\n' {
			lines = append(lines, string(data[start:i]))
			start = i + 1
		}
	}
	if start < len(data) {
		lines = append(lines, string(data[start:]))
	}
	return lines
}

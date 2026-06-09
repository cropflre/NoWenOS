package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"nowenos-server/internal/alerts"
	"nowenos-server/internal/auth"
	"nowenos-server/internal/database"
	"nowenos-server/internal/shares"
)

func setupTestServer(t *testing.T) *http.Handler {
	t.Helper()
	database.InitTestDB()
	auth.InitDB()
	shares.InitTable()
	alerts.InitTable()
	var h http.Handler = New()
	return &h
}

func getToken(t *testing.T) string {
	t.Helper()
	resp, err := auth.Login(auth.LoginRequest{Username: "admin", Password: "admin"})
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}
	return resp.Token
}

func TestHealthEndpoint(t *testing.T) {
	h := setupTestServer(t)
	defer database.CloseTestDB()

	req := httptest.NewRequest("GET", "/api/v1/health", nil)
	w := httptest.NewRecorder()
	(*h).ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var body map[string]string
	json.Unmarshal(w.Body.Bytes(), &body)
	if body["status"] != "ok" {
		t.Errorf("expected status 'ok', got '%s'", body["status"])
	}
}

func TestLoginEndpoint(t *testing.T) {
	h := setupTestServer(t)
	defer database.CloseTestDB()

	body, _ := json.Marshal(map[string]string{"username": "admin", "password": "admin"})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	(*h).ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestLoginEndpoint_BadCredentials(t *testing.T) {
	h := setupTestServer(t)
	defer database.CloseTestDB()

	body, _ := json.Marshal(map[string]string{"username": "admin", "password": "wrong"})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	(*h).ServeHTTP(w, req)

	if w.Code != 401 {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestProtectedRoute_NoToken(t *testing.T) {
	h := setupTestServer(t)
	defer database.CloseTestDB()

	req := httptest.NewRequest("GET", "/api/v1/system/info", nil)
	w := httptest.NewRecorder()
	(*h).ServeHTTP(w, req)

	if w.Code != 401 {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSystemInfoEndpoint(t *testing.T) {
	h := setupTestServer(t)
	defer database.CloseTestDB()

	token := getToken(t)
	req := httptest.NewRequest("GET", "/api/v1/system/info", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	(*h).ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestUsersEndpoint(t *testing.T) {
	h := setupTestServer(t)
	defer database.CloseTestDB()

	token := getToken(t)
	req := httptest.NewRequest("GET", "/api/v1/users", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	(*h).ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Data []auth.UserInfo `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Data) < 2 {
		t.Errorf("expected at least 2 users, got %d", len(resp.Data))
	}
}

func TestCreateUserEndpoint(t *testing.T) {
	h := setupTestServer(t)
	defer database.CloseTestDB()

	token := getToken(t)
	body, _ := json.Marshal(map[string]string{"username": "newuser", "password": "pass123", "role": "user"})
	req := httptest.NewRequest("POST", "/api/v1/users", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	(*h).ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSettingsEndpoint(t *testing.T) {
	h := setupTestServer(t)
	defer database.CloseTestDB()

	token := getToken(t)

	// GET settings
	req := httptest.NewRequest("GET", "/api/v1/settings", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	(*h).ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200, got %d", w.Code)
	}

	// PUT settings
	body, _ := json.Marshal(map[string]interface{}{
		"hostname":   "testhost",
		"httpPort":   9090,
		"logLevel":   "debug",
		"autoUpdate": true,
		"maxUpload":  2048,
	})
	req = httptest.NewRequest("PUT", "/api/v1/settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w = httptest.NewRecorder()
	(*h).ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSharesCRUD(t *testing.T) {
	h := setupTestServer(t)
	defer database.CloseTestDB()

	token := getToken(t)

	// Create
	body, _ := json.Marshal(map[string]interface{}{
		"name":     "testshare",
		"path":     "/mnt/data",
		"protocol": "smb",
		"readOnly": false,
		"guest":    false,
	})
	req := httptest.NewRequest("POST", "/api/v1/shares", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	(*h).ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("create: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var created struct {
		Data struct {
			ID int64 `json:"id"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &created)

	// List
	req = httptest.NewRequest("GET", "/api/v1/shares", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w = httptest.NewRecorder()
	(*h).ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("list: expected 200, got %d", w.Code)
	}

	// Delete
	req = httptest.NewRequest("DELETE", "/api/v1/shares/1", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w = httptest.NewRecorder()
	(*h).ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("delete: expected 200, got %d: %s", w.Code, w.Body.String())
	}
}


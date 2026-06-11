package auth

import (
	"errors"
	"nowenos-server/internal/database"
)

type Group struct {
	ID      int64  `json:"id"`
	Name    string `json:"name"`
	Comment string `json:"comment"`
}

func InitGroupsTable() {
	db := database.GetDB()
	db.Exec(`CREATE TABLE IF NOT EXISTS groups (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT UNIQUE NOT NULL,
		comment TEXT DEFAULT ''
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS user_groups (
		username TEXT NOT NULL,
		group_id INTEGER NOT NULL,
		PRIMARY KEY (username, group_id),
		FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
	)`)
}

func GetGroups() []Group {
	db := database.GetDB()
	rows, err := db.Query("SELECT id, name, comment FROM groups ORDER BY id")
	if err != nil {
		return []Group{}
	}
	defer rows.Close()
	groups := make([]Group, 0)
	for rows.Next() {
		var g Group
		if err := rows.Scan(&g.ID, &g.Name, &g.Comment); err != nil {
			continue
		}
		groups = append(groups, g)
	}
	return groups
}

func CreateGroup(name, comment string) (*Group, error) {
	if name == "" {
		return nil, errors.New("group name is required")
	}
	db := database.GetDB()
	result, err := db.Exec("INSERT INTO groups (name, comment) VALUES (?, ?)", name, comment)
	if err != nil {
		return nil, err
	}
	id, _ := result.LastInsertId()
	return &Group{ID: id, Name: name, Comment: comment}, nil
}

func DeleteGroup(id int64) error {
	db := database.GetDB()
	result, err := db.Exec("DELETE FROM groups WHERE id = ?", id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("group not found")
	}
	db.Exec("DELETE FROM user_groups WHERE group_id = ?", id)
	return nil
}

func AddUserToGroup(username string, groupID int64) error {
	db := database.GetDB()
	_, err := db.Exec("INSERT OR IGNORE INTO user_groups (username, group_id) VALUES (?, ?)", username, groupID)
	return err
}

func RemoveUserFromGroup(username string, groupID int64) error {
	db := database.GetDB()
	_, err := db.Exec("DELETE FROM user_groups WHERE username = ? AND group_id = ?", username, groupID)
	return err
}

func GetUserGroups(username string) []Group {
	db := database.GetDB()
	rows, err := db.Query("SELECT g.id, g.name, g.comment FROM groups g JOIN user_groups ug ON g.id = ug.group_id WHERE ug.username = ? ORDER BY g.id", username)
	if err != nil {
		return []Group{}
	}
	defer rows.Close()
	groups := make([]Group, 0)
	for rows.Next() {
		var g Group
		if err := rows.Scan(&g.ID, &g.Name, &g.Comment); err != nil {
			continue
		}
		groups = append(groups, g)
	}
	return groups
}

func GetGroupMembers(groupID int64) []string {
	db := database.GetDB()
	rows, err := db.Query("SELECT username FROM user_groups WHERE group_id = ? ORDER BY username", groupID)
	if err != nil {
		return []string{}
	}
	defer rows.Close()
	members := make([]string, 0)
	for rows.Next() {
		var u string
		if err := rows.Scan(&u); err != nil {
			continue
		}
		members = append(members, u)
	}
	return members
}

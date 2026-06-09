package systemadapter

import "errors"

var ErrNotImplemented = errors.New("not implemented yet")

// RunCommand will be the safe execution wrapper for system operations.
func RunCommand(name string, args ...string) ([]byte, error) {
	return nil, ErrNotImplemented
}
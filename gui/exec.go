package main

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

var (
	moleBinaryPath     string
	moleBinaryPathOnce sync.Once
)

// findMoleBinary locates the `mo` or `mole` binary on the system.
func findMoleBinary() string {
	moleBinaryPathOnce.Do(func() {
		// Check common locations in order of preference.
		candidates := []string{
			"mo",
			"mole",
		}

		// Also check explicit paths
		home, _ := os.UserHomeDir()
		explicitPaths := []string{
			"/opt/homebrew/bin/mo",
			"/opt/homebrew/bin/mole",
			"/usr/local/bin/mo",
			"/usr/local/bin/mole",
			filepath.Join(home, ".local", "bin", "mo"),
			filepath.Join(home, ".local", "bin", "mole"),
		}

		// Try PATH lookup first
		for _, name := range candidates {
			if path, err := exec.LookPath(name); err == nil {
				moleBinaryPath = path
				return
			}
		}

		// Try explicit paths
		for _, path := range explicitPaths {
			if _, err := os.Stat(path); err == nil {
				moleBinaryPath = path
				return
			}
		}

		// Fallback: try the sibling directory (when running from source)
		exePath, err := os.Executable()
		if err == nil {
			siblingMole := filepath.Join(filepath.Dir(exePath), "..", "mole")
			if _, err := os.Stat(siblingMole); err == nil {
				moleBinaryPath = siblingMole
				return
			}
		}
	})

	return moleBinaryPath
}

// runMoleCommand executes a mole CLI command and returns the output.
func runMoleCommand(args ...string) (string, error) {
	binary := findMoleBinary()
	if binary == "" {
		return "", fmt.Errorf("mole binary not found; install mole first (brew install mole)")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, binary, args...)

	// Ensure the command runs with a clean environment
	cmd.Env = append(os.Environ(),
		"TERM=dumb",       // Disable terminal escape codes
		"NO_COLOR=1",      // Disable color output
		"MO_NO_OPLOG=1",   // Disable operation logging
	)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		errMsg := strings.TrimSpace(stderr.String())
		if errMsg == "" {
			errMsg = err.Error()
		}
		return "", fmt.Errorf("command failed: %s", errMsg)
	}

	return strings.TrimSpace(stdout.String()), nil
}

package main

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

var (
	moleBinaryPath     string
	moleBinaryPathOnce sync.Once

	// ansiRegex strips ANSI escape sequences from terminal output.
	ansiRegex = regexp.MustCompile(`\x1b\[[0-9;]*[a-zA-Z]`)
)

// stripANSI removes all ANSI escape codes from a string.
func stripANSI(s string) string {
	return ansiRegex.ReplaceAllString(s, "")
}

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

// runMoleCommand executes a mole CLI command and returns the stripped output.
func runMoleCommand(args ...string) (string, error) {
	return runMoleCommandWithTimeout(30*time.Second, args...)
}

// runMoleCommandLong executes a mole CLI command with extended timeout (for clean/optimize).
// Clean can take 2-3 minutes scanning+deleting, so we allow 5 minutes.
func runMoleCommandLong(args ...string) (string, error) {
	return runMoleCommandWithTimeout(300*time.Second, args...)
}

func runMoleCommandWithTimeout(timeout time.Duration, args ...string) (string, error) {
	binary := findMoleBinary()
	if binary == "" {
		return "", fmt.Errorf("mole binary not found; install mole first (brew install mole)")
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, binary, args...)

	// Force non-interactive mode: connect stdin to /dev/null so bash's
	// `-t 0` check fails and scripts skip interactive prompts (sudo, read_key).
	devNull, err := os.Open(os.DevNull)
	if err == nil {
		cmd.Stdin = devNull
		defer devNull.Close()
	}

	// Ensure the command runs with a clean environment
	cmd.Env = append(os.Environ(),
		"TERM=dumb",
		"NO_COLOR=1",
		"MO_NO_OPLOG=1",
	)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		errMsg := strings.TrimSpace(stripANSI(stderr.String()))
		if errMsg == "" {
			errMsg = err.Error()
		}
		return "", fmt.Errorf("command failed: %s", errMsg)
	}

	return strings.TrimSpace(stripANSI(stdout.String())), nil
}

// runMoleCommandStreaming executes a command and streams stdout line-by-line
// via a callback function. Used for clean/optimize to show live progress.
func runMoleCommandStreaming(onLine func(string), args ...string) error {
	binary := findMoleBinary()
	if binary == "" {
		return fmt.Errorf("mole binary not found; install mole first (brew install mole)")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, binary, args...)

	devNull, err := os.Open(os.DevNull)
	if err == nil {
		cmd.Stdin = devNull
		defer devNull.Close()
	}

	cmd.Env = append(os.Environ(),
		"TERM=dumb",
		"NO_COLOR=1",
		"MO_NO_OPLOG=1",
	)

	// Get a pipe to read stdout line by line
	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	cmd.Stderr = nil // ignore stderr for streaming

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start command: %w", err)
	}

	// Read line by line and emit events
	buf := make([]byte, 0, 4096)
	tmp := make([]byte, 256)
	for {
		n, readErr := stdoutPipe.Read(tmp)
		if n > 0 {
			buf = append(buf, tmp[:n]...)
			// Process complete lines
			for {
				idx := bytes.IndexByte(buf, '\n')
				if idx < 0 {
					break
				}
				line := stripANSI(strings.TrimRight(string(buf[:idx]), "\r"))
				buf = buf[idx+1:]
				if line != "" {
					onLine(line)
				}
			}
		}
		if readErr != nil {
			break
		}
	}

	// Flush any remaining partial line
	if len(buf) > 0 {
		line := stripANSI(strings.TrimRight(string(buf), "\r\n"))
		if line != "" {
			onLine(line)
		}
	}

	return cmd.Wait()
}

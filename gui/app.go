package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"
)

// App struct provides the backend API for the Mole GUI.
type App struct {
	ctx context.Context

	// Cache system status to avoid hammering the CLI
	statusMu    sync.Mutex
	statusCache *SystemStatus
	statusAt    time.Time
	cacheTTL    time.Duration
}

// NewApp creates a new App instance.
func NewApp() *App {
	return &App{
		cacheTTL: 1 * time.Second,
	}
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// shutdown is called when the app is closing.
func (a *App) shutdown(ctx context.Context) {
	// Cleanup if needed
}

// --- Data Types ---

// SystemStatus represents the full system metrics snapshot.
type SystemStatus struct {
	CollectedAt    string       `json:"collected_at"`
	Host           string       `json:"host"`
	Platform       string       `json:"platform"`
	Uptime         string       `json:"uptime"`
	UptimeSeconds  uint64       `json:"uptime_seconds"`
	Procs          uint64       `json:"procs"`
	Hardware       HardwareInfo `json:"hardware"`
	HealthScore    int          `json:"health_score"`
	HealthScoreMsg string       `json:"health_score_msg"`

	CPU       CPUStatus       `json:"cpu"`
	GPU       []GPUStatus     `json:"gpu"`
	Memory    MemoryStatus    `json:"memory"`
	Disks     []DiskStatus    `json:"disks"`
	TrashSize uint64          `json:"trash_size"`
	DiskIO    DiskIOStatus    `json:"disk_io"`
	Network   []NetworkStatus `json:"network"`
	Proxy     ProxyStatus     `json:"proxy"`
	Batteries []BatteryStatus `json:"batteries"`
	Thermal   ThermalStatus   `json:"thermal"`
	Bluetooth []BluetoothDevice `json:"bluetooth"`
	TopProcesses []ProcessInfo `json:"top_processes"`
}

type HardwareInfo struct {
	Model       string `json:"model"`
	CPUModel    string `json:"cpu_model"`
	TotalRAM    string `json:"total_ram"`
	DiskSize    string `json:"disk_size"`
	OSVersion   string `json:"os_version"`
	RefreshRate string `json:"refresh_rate"`
}

type CPUStatus struct {
	Usage      float64   `json:"usage"`
	PerCore    []float64 `json:"per_core"`
	Load1      float64   `json:"load1"`
	Load5      float64   `json:"load5"`
	Load15     float64   `json:"load15"`
	CoreCount  int       `json:"core_count"`
	LogicalCPU int       `json:"logical_cpu"`
	PCoreCount int       `json:"p_core_count"`
	ECoreCount int       `json:"e_core_count"`
}

type GPUStatus struct {
	Name        string  `json:"name"`
	Usage       float64 `json:"usage"`
	MemoryUsed  float64 `json:"memory_used"`
	MemoryTotal float64 `json:"memory_total"`
	CoreCount   int     `json:"core_count"`
	Note        string  `json:"note"`
}

type MemoryStatus struct {
	Used        uint64  `json:"used"`
	Total       uint64  `json:"total"`
	UsedPercent float64 `json:"used_percent"`
	SwapUsed    uint64  `json:"swap_used"`
	SwapTotal   uint64  `json:"swap_total"`
	Cached      uint64  `json:"cached"`
	Pressure    string  `json:"pressure"`
}

type DiskStatus struct {
	Mount       string  `json:"mount"`
	Device      string  `json:"device"`
	Used        uint64  `json:"used"`
	Total       uint64  `json:"total"`
	UsedPercent float64 `json:"used_percent"`
	Fstype      string  `json:"fstype"`
	External    bool    `json:"external"`
}

type DiskIOStatus struct {
	ReadRate  float64 `json:"read_rate"`
	WriteRate float64 `json:"write_rate"`
}

type NetworkStatus struct {
	Name      string  `json:"name"`
	RxRateMBs float64 `json:"rx_rate_mbs"`
	TxRateMBs float64 `json:"tx_rate_mbs"`
	IP        string  `json:"ip"`
}

type ProxyStatus struct {
	Enabled bool   `json:"enabled"`
	Type    string `json:"type"`
	Host    string `json:"host"`
}

type BatteryStatus struct {
	Percent    float64 `json:"percent"`
	Status     string  `json:"status"`
	TimeLeft   string  `json:"time_left"`
	Health     string  `json:"health"`
	CycleCount int     `json:"cycle_count"`
	Capacity   int     `json:"capacity"`
}

type ThermalStatus struct {
	CPUTemp      float64 `json:"cpu_temp"`
	GPUTemp      float64 `json:"gpu_temp"`
	BatteryTemp  float64 `json:"battery_temp"`
	FanSpeed     int     `json:"fan_speed"`
	FanCount     int     `json:"fan_count"`
	SystemPower  float64 `json:"system_power"`
	AdapterPower float64 `json:"adapter_power"`
	BatteryPower float64 `json:"battery_power"`
}

type BluetoothDevice struct {
	Name      string `json:"name"`
	Connected bool   `json:"connected"`
	Battery   string `json:"battery"`
}

type ProcessInfo struct {
	PID     int     `json:"pid"`
	PPID    int     `json:"ppid"`
	Name    string  `json:"name"`
	Command string  `json:"command"`
	CPU     float64 `json:"cpu"`
	Memory  float64 `json:"memory"`
}

// --- API Methods (exposed to frontend) ---

// GetSystemStatus returns current system metrics by calling `mo status --json`.
func (a *App) GetSystemStatus() (*SystemStatus, error) {
	a.statusMu.Lock()
	defer a.statusMu.Unlock()

	// Return cached if fresh enough
	if a.statusCache != nil && time.Since(a.statusAt) < a.cacheTTL {
		return a.statusCache, nil
	}

	output, err := runMoleCommand("status", "--json")
	if err != nil {
		return nil, fmt.Errorf("failed to get system status: %w", err)
	}

	var status SystemStatus
	if err := json.Unmarshal([]byte(output), &status); err != nil {
		return nil, fmt.Errorf("failed to parse status JSON: %w", err)
	}

	a.statusCache = &status
	a.statusAt = time.Now()

	return &status, nil
}

// GetVersion returns the Mole CLI version string (first line only).
func (a *App) GetVersion() string {
	output, err := runMoleCommand("--version")
	if err != nil {
		return "unknown"
	}
	// mo --version outputs multiple lines; extract just the version line.
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.Contains(line, "version") {
			return line
		}
	}
	if len(lines) > 0 {
		return strings.TrimSpace(lines[0])
	}
	return output
}

// RunClean triggers a cleanup scan. If dryRun is true, only previews what would be cleaned.
func (a *App) RunClean(dryRun bool) (string, error) {
	args := []string{"clean"}
	if dryRun {
		args = append(args, "--dry-run")
	}
	output, err := runMoleCommandLong(args...)
	if err != nil {
		return "", fmt.Errorf("clean failed: %w", err)
	}
	return output, nil
}

// RunOptimize triggers system optimization. If dryRun is true, only previews.
func (a *App) RunOptimize(dryRun bool) (string, error) {
	args := []string{"optimize"}
	if dryRun {
		args = append(args, "--dry-run")
	}
	output, err := runMoleCommandLong(args...)
	if err != nil {
		return "", fmt.Errorf("optimize failed: %w", err)
	}
	return output, nil
}

// GetDiskAnalysis returns disk analysis for a given path.
func (a *App) GetDiskAnalysis(path string) (string, error) {
	args := []string{"analyze", "--json"}
	if path != "" {
		args = append(args, path)
	}
	output, err := runMoleCommand(args...)
	if err != nil {
		return "", fmt.Errorf("analyze failed: %w", err)
	}
	return output, nil
}

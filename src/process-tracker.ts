/**
 * Tracks PIDs spawned by forge/gauge so only those specific processes
 * are killed during cleanup — never broad process kills.
 */

const activePids = new Set<number>();

export function registerPid(pid: number): void {
  activePids.add(pid);
}

export function unregisterPid(pid: number): void {
  activePids.delete(pid);
}

export function getActivePids(): ReadonlySet<number> {
  return activePids;
}

export function killActiveProcesses(signal: NodeJS.Signals = 'SIGTERM'): void {
  for (const pid of activePids) {
    try {
      process.kill(pid, signal);
    } catch {
      // Process already exited — ignore
    }
  }
  activePids.clear();
}

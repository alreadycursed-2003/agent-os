import { execFile } from 'node:child_process';

/** Run a `claude` CLI subcommand with args array (no shell). */
export function claude(args, timeout = 60000) {
  return new Promise((resolve) => {
    execFile(
      'claude',
      args,
      { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({
          ok: !err,
          code: err ? (typeof err.code === 'number' ? err.code : 1) : 0,
          stdout: stdout?.toString() ?? '',
          stderr: stderr?.toString() ?? '',
        });
      }
    );
  });
}

#!/usr/bin/env node

/**
 * Cross-platform script to kill a process using a specific port
 * Usage: node scripts/kill-port.js <port>
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const port = process.argv[2] || '5000';

async function killPort(port) {
  const isWindows = process.platform === 'win32';

  try {
    if (isWindows) {
      // Windows: Find process using port and kill it
      let stdout = '';
      try {
        const result = await execAsync(`netstat -ano | findstr :${port}`);
        stdout = result.stdout;
      } catch (error) {
        // findstr returns exit code 1 when no match is found, which is not an error
        if (error.code === 1 || error.message.includes('findstr')) {
          console.log(`No process found using port ${port}`);
          return;
        }
        throw error;
      }
      
      if (!stdout.trim()) {
        console.log(`No process found using port ${port}`);
        return;
      }

      // Extract PID from netstat output
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) {
          pids.add(pid);
        }
      }

      if (pids.size === 0) {
        console.log(`No process found using port ${port}`);
        return;
      }

      // Kill all processes using the port
      for (const pid of pids) {
        try {
          await execAsync(`taskkill /PID ${pid} /F`);
          console.log(`Killed process ${pid} using port ${port}`);
        } catch (error) {
          // Process might have already terminated, ignore
          if (!error.message.includes('not found')) {
            console.error(`Error killing process ${pid}:`, error.message);
          }
        }
      }
    } else {
      // Unix/Linux/Mac: Find and kill process using port
      try {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        const pids = stdout.trim().split('\n').filter(Boolean);
        
        if (pids.length === 0) {
          console.log(`No process found using port ${port}`);
          return;
        }

        for (const pid of pids) {
          try {
            await execAsync(`kill -9 ${pid}`);
            console.log(`Killed process ${pid} using port ${port}`);
          } catch (error) {
            console.error(`Error killing process ${pid}:`, error.message);
          }
        }
      } catch (error) {
        // lsof returns non-zero exit code if no process found
        if (error.code === 1) {
          console.log(`No process found using port ${port}`);
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error(`Error checking port ${port}:`, error.message);
    process.exit(1);
  }
}

killPort(port);


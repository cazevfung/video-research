#!/usr/bin/env ts-node
/**
 * Development Reset Script
 * 
 * Clears all local test data (summaries and users).
 * Optionally creates a backup before clearing.
 * 
 * Usage: npm run dev:reset [--backup]
 */

import fs from 'fs/promises';
import path from 'path';
import { getSummariesDirectory, getUsersDirectory, useLocalStorage } from '../src/config';

async function clearDirectory(dir: string): Promise<number> {
  try {
    const files = await fs.readdir(dir);
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile() && file.endsWith('.json')) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }
    
    return deletedCount;
  } catch (error) {
    // Directory might not exist, which is fine
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    return 0;
  }
}

async function createBackup(summariesDir: string, usersDir: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = path.join(process.cwd(), 'data', `backup-${timestamp}`);
  
  await fs.mkdir(backupDir, { recursive: true });
  const summariesBackup = path.join(backupDir, 'summaries');
  const usersBackup = path.join(backupDir, 'users');
  
  await fs.mkdir(summariesBackup, { recursive: true });
  await fs.mkdir(usersBackup, { recursive: true });
  
  // Copy summaries
  try {
    const summaryFiles = await fs.readdir(summariesDir);
    for (const file of summaryFiles) {
      if (file.endsWith('.json')) {
        await fs.copyFile(
          path.join(summariesDir, file),
          path.join(summariesBackup, file)
        );
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  
  // Copy users
  try {
    const userFiles = await fs.readdir(usersDir);
    for (const file of userFiles) {
      if (file.endsWith('.json')) {
        await fs.copyFile(
          path.join(usersDir, file),
          path.join(usersBackup, file)
        );
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  
  return backupDir;
}

async function resetLocalData(createBackupFlag: boolean = false) {
  console.log('\n🔄 Resetting local test data...\n');

  try {
    // Check if using local storage
    const useLocalStorageValue = useLocalStorage();
    if (!useLocalStorageValue) {
      console.log('⚠️  WARNING: Local storage is not enabled!');
      console.log('   This script only works when USE_LOCAL_STORAGE=true');
      console.log('   Current storage mode: FIRESTORE');
      console.log('   Aborting to prevent accidental data loss.\n');
      process.exit(1);
    }

    // Get centralized directory paths
    const summariesDir = getSummariesDirectory();
    const usersDir = getUsersDirectory();

    // Count files before deletion
    let summariesCount = 0;
    let usersCount = 0;
    
    try {
      const summaryFiles = await fs.readdir(summariesDir);
      summariesCount = summaryFiles.filter(f => f.endsWith('.json')).length;
    } catch {
      // Directory doesn't exist, which is fine
    }
    
    try {
      const userFiles = await fs.readdir(usersDir);
      usersCount = userFiles.filter(f => f.endsWith('.json')).length;
    } catch {
      // Directory doesn't exist, which is fine
    }

    if (summariesCount === 0 && usersCount === 0) {
      console.log('✅ No data to reset. Directories are already empty.');
      return;
    }

    console.log(`Found ${summariesCount} summary files and ${usersCount} user files.`);

    // Create backup if requested
    if (createBackupFlag) {
      console.log('\n💾 Creating backup...');
      const backupDir = await createBackup(summariesDir, usersDir);
      console.log(`✅ Backup created: ${backupDir}`);
    } else {
      console.log('\n⚠️  WARNING: This will permanently delete all local test data!');
      console.log('   Use --backup flag to create a backup first.');
      
      // Give user a moment to cancel (in case they want to)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Clear directories
    console.log('\n🗑️  Deleting files...');
    const deletedSummaries = await clearDirectory(summariesDir);
    const deletedUsers = await clearDirectory(usersDir);

    console.log(`✅ Deleted ${deletedSummaries} summary files`);
    console.log(`✅ Deleted ${deletedUsers} user files`);
    console.log('\n✅ Local test data reset complete!\n');

  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const shouldBackup = args.includes('--backup') || args.includes('-b');

// Run reset
resetLocalData(shouldBackup).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});



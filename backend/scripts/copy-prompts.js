/**
 * Copy prompt markdown files to dist directory
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/prompts');
const distDir = path.join(__dirname, '../dist/prompts');

// Required prompt files that must be copied
const requiredFiles = [
  'final-summary.prompt.md',
  'title-generation.prompt.md',
  'pre-condense.prompt.md'
];

// Ensure dist/prompts directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log('Created dist/prompts directory');
}

// Check if src directory exists
if (!fs.existsSync(srcDir)) {
  console.error(`ERROR: Source directory does not exist: ${srcDir}`);
  process.exit(1);
}

console.log(`Source directory: ${srcDir}`);
console.log(`Destination directory: ${distDir}`);

// Copy all .md files from src/prompts to dist/prompts
let files;
try {
  files = fs.readdirSync(srcDir);
  console.log(`Found ${files.length} file(s) in src/prompts:`, files.join(', '));
} catch (error) {
  console.error(`ERROR: Failed to read source directory:`, error.message);
  process.exit(1);
}

const copiedFiles = [];
const missingFiles = [];

// First, try to copy the required files explicitly
requiredFiles.forEach((file) => {
  const srcPath = path.join(srcDir, file);
  const distPath = path.join(distDir, file);
  
  try {
    if (!fs.existsSync(srcPath)) {
      console.error(`ERROR: Required file does not exist: ${srcPath}`);
      missingFiles.push(file);
      return;
    }
    
    fs.copyFileSync(srcPath, distPath);
    console.log(`✓ Copied ${file} to dist/prompts/`);
    copiedFiles.push(file);
  } catch (error) {
    console.error(`ERROR: Failed to copy ${file}:`, error.message);
    missingFiles.push(file);
  }
});

// Also copy any other .md files that might exist
files.forEach((file) => {
  if (file.endsWith('.md') && !copiedFiles.includes(file)) {
    const srcPath = path.join(srcDir, file);
    const distPath = path.join(distDir, file);
    
    try {
      if (!fs.existsSync(srcPath)) {
        console.error(`ERROR: Source file does not exist: ${srcPath}`);
        missingFiles.push(file);
        return;
      }
      
      fs.copyFileSync(srcPath, distPath);
      console.log(`✓ Copied ${file} to dist/prompts/`);
      copiedFiles.push(file);
    } catch (error) {
      console.error(`ERROR: Failed to copy ${file}:`, error.message);
      missingFiles.push(file);
    }
  }
});

// Verify all required files were copied
console.log('\n=== Verification ===');
let allFilesPresent = true;
requiredFiles.forEach((file) => {
  const distPath = path.join(distDir, file);
  if (fs.existsSync(distPath)) {
    console.log(`✓ ${file} exists in dist/prompts/`);
  } else {
    console.error(`✗ ${file} MISSING in dist/prompts/`);
    allFilesPresent = false;
  }
});

if (missingFiles.length > 0) {
  console.error(`\nERROR: Failed to copy ${missingFiles.length} file(s):`, missingFiles);
  process.exit(1);
}

if (!allFilesPresent) {
  console.error('\nERROR: Not all required prompt files are present in dist/prompts/');
  process.exit(1);
}

console.log(`\n✓ Successfully copied ${copiedFiles.length} prompt file(s) to dist/prompts/`);

// Copy prompt subdirectories: general, research, summary (and optionally utils)
function copyPromptSubdir(subdirName) {
  const srcSubdir = path.join(srcDir, subdirName);
  const distSubdir = path.join(distDir, subdirName);

  if (!fs.existsSync(srcSubdir)) {
    console.error(`ERROR: Directory not found at ${srcSubdir}`);
    console.error(`   Current working directory: ${process.cwd()}`);
    console.error(`   Source directory: ${srcDir}`);
    if (fs.existsSync(srcDir)) {
      console.error(`   Contents of src/prompts: ${fs.readdirSync(srcDir).join(', ')}`);
    }
    process.exit(1);
  }

  if (!fs.existsSync(distSubdir)) {
    fs.mkdirSync(distSubdir, { recursive: true });
    console.log(`Created dist/prompts/${subdirName} directory`);
  }

  let files;
  try {
    files = fs.readdirSync(srcSubdir);
  } catch (error) {
    console.error(`ERROR: Failed to read ${subdirName} directory:`, error.message);
    process.exit(1);
  }

  const mdFiles = files.filter((f) => f.endsWith('.md'));
  if (mdFiles.length === 0) {
    console.error(`ERROR: No .md files in src/prompts/${subdirName}/`);
    process.exit(1);
  }

  console.log(`\nFound ${mdFiles.length} file(s) in src/prompts/${subdirName}:`, mdFiles.join(', '));
  mdFiles.forEach((file) => {
    const srcPath = path.join(srcSubdir, file);
    const distPath = path.join(distSubdir, file);
    fs.copyFileSync(srcPath, distPath);
    console.log(`✓ Copied ${subdirName}/${file} to dist/prompts/${subdirName}/`);
  });
  console.log(`✓ Successfully copied ${mdFiles.length} file(s) to dist/prompts/${subdirName}/`);
}

['general', 'research', 'summary'].forEach(copyPromptSubdir);

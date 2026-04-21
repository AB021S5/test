const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const screenshotsDir = path.join(projectRoot, 'screenshots');
const keepRunsRaw = process.env.PW_SCREENSHOT_KEEP_RUNS || '1';
const keepRunsParsed = Number.parseInt(keepRunsRaw, 10);
const keepRuns = Number.isFinite(keepRunsParsed) && keepRunsParsed >= 0 ? keepRunsParsed : 1;

const pathsToRemove = [
  'playwright-report',
  'test-results',
  'test_output.txt',
  'playwright-result.json',
];

for (const relativePath of pathsToRemove) {
  const fullPath = path.join(projectRoot, relativePath);
  fs.rmSync(fullPath, { recursive: true, force: true });
}

// Recreate test-results so the JSON reporter can always write results.json.
fs.mkdirSync(path.join(projectRoot, 'test-results'), { recursive: true });
fs.mkdirSync(screenshotsDir, { recursive: true });

if (keepRuns === 0) {
  for (const entry of fs.readdirSync(screenshotsDir, { withFileTypes: true })) {
    fs.rmSync(path.join(screenshotsDir, entry.name), { recursive: true, force: true });
  }
} else {
  const entries = fs.readdirSync(screenshotsDir, { withFileTypes: true });

  // Remove loose screenshot files to keep storage low.
  for (const entry of entries) {
    if (entry.isFile()) {
      fs.rmSync(path.join(screenshotsDir, entry.name), { force: true });
    }
  }

  const runDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('run_'))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));

  for (const dirName of runDirs.slice(keepRuns)) {
    fs.rmSync(path.join(screenshotsDir, dirName), { recursive: true, force: true });
  }

  // Remove non-standard folders that are not retention run folders.
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('run_')) {
      fs.rmSync(path.join(screenshotsDir, entry.name), { recursive: true, force: true });
    }
  }
}

console.log(
  `Pre-run maintenance completed: artifacts cleared; screenshots retention keepRuns=${keepRuns}.`
);

const fs = require('fs');
const path = require('path');

async function atomicWriteState(state, filePath) {
  state.last_updated = Date.now();
  state.version = (state.version || 0) + 1;

  const json = JSON.stringify(state, null, 2);
  const dir = path.dirname(filePath);
  const tmpPath = path.join(dir, `.thymos_tmp_${process.pid}_${Date.now()}`);

  await fs.promises.mkdir(dir, { recursive: true });

  try {
    await fs.promises.writeFile(tmpPath, json, 'utf8');
    await fs.promises.rename(tmpPath, filePath);
  } catch (err) {
    try {
      await fs.promises.unlink(tmpPath);
    } catch {
      // ignore cleanup errors
    }
    throw err;
  }
}

module.exports = { atomicWriteState };

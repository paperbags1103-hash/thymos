const fs = require('fs');
const path = require('path');

// Fix #6: __dirname 기반 경로 (process.cwd() 의존 제거 — 어디서 실행해도 동작)
const rootDir = path.resolve(__dirname, '..', '..');
const defaultsPath = path.resolve(rootDir, 'config/defaults.json');
const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));

module.exports = {
  ...defaults,
  neuromodulatorConfigs: defaults.neuromodulators,
  tickIntervalSec: defaults.tickInterval / 1000,
  ports: {
    webhook: defaults.webhookPort,
  },
  paths: {
    stateFile: path.resolve(rootDir, defaults.stateFile),
    relationshipsFile: path.resolve(rootDir, defaults.relationshipsFile),
    memoriesFile: path.resolve(rootDir, defaults.memoriesFile),
    somaticFile: path.resolve(rootDir, defaults.somaticFile),
  },
};

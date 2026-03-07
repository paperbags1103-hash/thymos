const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const defaultsPath = path.resolve(rootDir, 'config/defaults.json');
const proactivePath = path.resolve(rootDir, 'config/proactive.json');

const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));

let proactive = { enabled: false };
try {
  proactive = JSON.parse(fs.readFileSync(proactivePath, 'utf8'));
} catch {
  // no proactive config — proactive messaging disabled
}

module.exports = {
  ...defaults,
  proactive,
  neuromodulatorConfigs: defaults.neuromodulators,
  tickIntervalSec: defaults.tickInterval / 1000,
  ports: { webhook: defaults.webhookPort },
  paths: {
    stateFile: path.resolve(rootDir, defaults.stateFile),
    relationshipsFile: path.resolve(rootDir, defaults.relationshipsFile),
    memoriesFile: path.resolve(rootDir, defaults.memoriesFile),
    somaticFile: path.resolve(rootDir, defaults.somaticFile),
  },
};

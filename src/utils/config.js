const fs = require('fs');
const path = require('path');

const defaultsPath = path.resolve(process.cwd(), 'config/defaults.json');
const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));

module.exports = {
  ...defaults,
  neuromodulatorConfigs: defaults.neuromodulators,
  tickIntervalSec: defaults.tickInterval / 1000,
  ports: {
    webhook: defaults.webhookPort,
  },
  paths: {
    stateFile: path.resolve(process.cwd(), defaults.stateFile),
    relationshipsFile: path.resolve(process.cwd(), defaults.relationshipsFile),
    memoriesFile: path.resolve(process.cwd(), defaults.memoriesFile),
    somaticFile: path.resolve(process.cwd(), defaults.somaticFile),
  },
};

const { addNoise } = require('../utils/math');

function addNoiseDevelopmental(delta, volatility) {
  return addNoise(delta, 0.15 * volatility);
}

module.exports = { addNoiseDevelopmental };

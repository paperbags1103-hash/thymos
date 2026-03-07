function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function hillResponse(stimulus, EC50, n, Emax) {
  const ec50 = typeof EC50 === 'number' ? EC50 : 40;
  const hillN = typeof n === 'number' ? n : 2.5;
  const emax = typeof Emax === 'number' ? Emax : 30;

  const sn = Math.pow(Math.abs(stimulus), hillN);
  const ec50n = Math.pow(ec50, hillN);
  const response = emax * (sn / (ec50n + sn));
  return stimulus >= 0 ? response : -response;
}

function decay(currentValue, baseline, tau, elapsedMin) {
  return baseline + (currentValue - baseline) * Math.exp(-elapsedMin / tau);
}

function gaussianNoise(mean, stddev) {
  const u1 = Math.max(Number.EPSILON, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

function addNoise(delta, noiseFraction) {
  const frac = typeof noiseFraction === 'number' ? noiseFraction : 0.15;
  if (delta === 0) return 0;
  const noise = gaussianNoise(0, Math.abs(delta) * frac);
  return delta + noise;
}

function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

function stddev(arr) {
  if (!arr || arr.length === 0) return 0;
  const mean = avg(arr);
  const variance = avg(arr.map((v) => (v - mean) ** 2));
  return Math.sqrt(variance);
}

module.exports = {
  clamp,
  hillResponse,
  decay,
  gaussianNoise,
  addNoise,
  avg,
  stddev,
};

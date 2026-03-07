function getCircadianModifiers(hour) {
  const periods = [
    [6, 9, +8, +5, 0, 0, +8, -5, +5],
    [9, 12, +10, 0, +3, 0, +5, -3, +8],
    [12, 14, 0, 0, +5, +3, -3, +5, 0],
    [14, 18, +5, 0, 0, 0, 0, 0, +5],
    [18, 22, 0, 0, +3, +8, -5, +3, -3],
    [22, 2, -5, 0, -3, 0, -10, +8, -5],
    [2, 6, -10, -3, -5, 0, -15, +10, -8],
  ];

  const modifiers = {
    dopamine: 0,
    cortisol: 0,
    serotonin: 0,
    oxytocin: 0,
    norepinephrine: 0,
    gaba: 0,
    acetylcholine: 0,
  };

  const names = [
    'dopamine',
    'cortisol',
    'serotonin',
    'oxytocin',
    'norepinephrine',
    'gaba',
    'acetylcholine',
  ];

  for (const [start, end, ...mods] of periods) {
    const inRange = start < end ? hour >= start && hour < end : hour >= start || hour < end;
    if (inRange) {
      names.forEach((name, i) => {
        modifiers[name] = mods[i];
      });
      break;
    }
  }

  return modifiers;
}

module.exports = { getCircadianModifiers };

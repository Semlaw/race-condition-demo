const adminLevelList = [
  {
    range: [1, 6],
    level: 'province',
  },
  {
    range: [7, 12],
    level: 'city',
  },
  {
    range: [13, 20],
    level: 'country',
  },
];

export function getAdminLevel(zoom) {
  const target = adminLevelList.find((model) => model.range[0] <= zoom && model.range[1] >= zoom);
  return target && target.level;
}

export function getNextLevelZoom(level) {
  const idx = adminLevelList.findIndex((model) => model.level === level);
  const next = adminLevelList[idx + 1];
  return next;
}

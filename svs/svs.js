import nprogress from 'nprogress';

const rawData = require('./data/raw.json');

console.log('rawData', rawData);

function getFlatData(data) {
  return data.map((oneKey) => {
    const provinceLevelList = [];
    const cityLevelList = [];
    const countyLevelList = [];
    oneKey.statistics.allAdmins.forEach(({
      name, count, adminCode: provinceCode, lon, lat, childAdmins: cityChild = []
    }) => {
      provinceLevelList.push({
        name, count, adminCode: provinceCode, lon, lat,
      });
      cityChild.forEach(({
        name: cityName, count: cityLevelCount, adminCode: cityCode,
        lon: cityLevelLon, lat: cityLevelLat, areaStatistics: countryChild = []
      }) => {
        cityLevelList.push({
          name: cityName,
          count: cityLevelCount,
          provinceCode,
          adminCode: cityCode,
          lon: cityLevelLon,
          lat: cityLevelLat,
        });
        countryChild.forEach(({
          name: countryName, count: countryLevelCount, adminCode: countryCode,
          lon: countryLevelLon, lat: countryLevelLat
        }) => {
          countyLevelList.push({
            countryName,
            count: countryLevelCount,
            provinceCode,
            cityCode,
            adminCode: countryCode,
            lon: countryLevelLon,
            lat: countryLevelLat,
          });
        });
      });
    });
    return {
      keyWord: oneKey.keyWord,
      province: provinceLevelList,
      city: cityLevelList,
      country: countyLevelList
    };
  });
}

let loadingCount = 0;

function progressController(promise) {
  loadingCount += 1;
  nprogress.start();
  promise.finally(() => {
    loadingCount -= 1;
    if (loadingCount === 0) {
      nprogress.done();
    }
  });
}

const levelMapList = getFlatData(rawData);
console.log('levelMap', levelMapList);

function defer() {
  const dfd = {};
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
}
/**
 *
 * @param {*} params
 * @property {string} keyWord - 中学 高等院校 职业技术学校
 * @property {string} adminLevel - province省 city市 county县
 * @property {string} city - cityCode adminLevel为county时需要该参数
 *
 * @returns {array} dataList
 */
// eslint-disable-next-line import/prefer-default-export
export function queryData(params, { cancelToken }) {
  console.log('queryData', params);

  const def = defer();
  const { keyWord, adminLevel, city } = params;
  const target = levelMapList.find((model) => model.keyWord === keyWord);
  let ret = target[adminLevel] || [];
  if (adminLevel === 'country') {
    ret = ret.filter((model) => model.cityCode === city);
  }

  cancelToken.then(() => {
    def.reject('request cancel');
  });
  setTimeout(() => {
    def.resolve(ret);
  }, Math.random() * 2.5e3);
  progressController(def.promise);
  return def.promise;
}

export function getCityList() {
  const def = defer();
  const cityList = levelMapList[0].city.map(({
    name,
    count,
    adminCode,
    lon,
    lat
  }) => ({
    name,
    count,
    adminCode,
    lon,
    lat
  }));
  def.resolve(cityList);
  return def.promise;
}

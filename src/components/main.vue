<template>
  <div class="amap-wrapper">
    <el-amap
      :events="events"
      :zoom="zoom"
      :plugin="plugins"
      class="amap-box"
      :vid="'amap-vue'"
    >
      <el-amap-marker
        v-for="(marker, index) in rectLabelDataList"
        :key="'rectLabel@'+index"
        :position="marker.position"
        :events="marker.events"
        :content="marker.content"
        :offset="marker.offset"
      />
    </el-amap>
    <div class="left-panel">
      <h3>
        专题图层
      </h3>
      <div
        v-for="item in dataList"
        :key="item.keyWord"
      >
        <el-checkbox
          v-model="item.checked"
          @change="coverageChangeHandle(item,$event)"
        >
          <div class="checkbox-row">
            <span class="checkbox-text">{{ item.keyWord }}</span>
            <span
              class="color-indicator"
              :style="{background:getIndicatorColor(item)}"
            />
          </div>
        </el-checkbox>
      </div>
    </div>
    <div class="top-panel">
      <span style="margin-right:10px">数据更新时间</span>
      <el-date-picker
        v-model="time"
        :picker-options="pickerOptions"
        :clearable="false"
        :editable="false"
        popper-class="my-date-picker-clear-nowbtn"
        type="datetime"
        prefix-icon="none"
        format="yyyy-MM-dd"
        value-format="yyyyMMdd"
        align="right"
        placeholder="选择日期时间"
        @change="timeChange"
      />
      <el-select
        v-model="city"
        filterable
        style="margin-left:10px"
        value-key="adminCode"
        placeholder="请选择"
        @change="cityChangeHandle"
      >
        <el-option
          v-for="item in cityList"
          :key="item.adminCode"
          :label="item.name"
          :value="item"
        />
      </el-select>
    </div>
  </div>
</template>

<script>
import * as svs from 'svs/svs.js';
import moment from 'moment';
import { debounce } from 'underscore';
import DataCacher from 'data-cacher';
import { getAdminLevel, getNextLevelZoom } from '../util/index';

const colorList = ['#33CCCC', '#EE7600', '#FF0000'];
/**
 * applyGetCoverageData 请求获取相应的地图数据,使用场景time、图层、地图zoom、amap 改变;
  * getCoverageData 获取当前需要的数据;
 * needRequestValidate - 判断是否需要发起请求 getCoverageData函数调用;
 * getCoverageRequestParams 构造用于请求（查询）的参数;
 * clearOneCoveragDataModel - cancel仍在pending的请求图层被移除前调用，或者图层数据被完全初始化时调用;
 * initOneCoveragDataModel - 初始化数据模型
 * 新增coverage时调用
 * 需要重置图层数据时调用 ：time、city变化时
 * coverageDataSave 将接口返回的数据存储到本地
 * 数据返回时调用
 * applyPrepareRenderData 准备用于渲染的数据dataModel.currentUsedData，
 通过currentUsedDataParams判断是否需要重新设置currentUsedData
*/

function defer() {
  const dfd = {};
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
}

const cacheMap = new WeakMap();

console.log('svs', svs);
export default {
  name: 'HelloWorld',
  data() {
    return {
      dataList: [
        { keyWord: '中学' },
        { keyWord: '高等院校' },
        { keyWord: '职业技术学校' },
      ],
      cityList: [],
      city: null,
      coverageList: [],
      zoom: 5,
      time: moment().subtract('day', 1).format('YYYYMMDD'),
      pickerOptions: {
        disabledDate(time) {
          return time.getTime() > Date.now() - (3600 * 1000 * 0);
        },
      },
      events: {
        init: (amapInstance) => {
          this.amap = amapInstance;
          const zoom = this.amap.getZoom();
          this.zoom = zoom;
          amapInstance.setMapStyle('amap://styles/whitesmoke');// 维护人员：liujintao07128@hellobike.com
        },
        complete: () => {
          this.mapLoading = false;
          this.debounceApplyGetCoverageData();
        },
        mapmove: () => {
          this.debounceApplyGetCoverageData('notResetRenderData');
        },
        zoomchange: () => {
          const zoom = this.amap.getZoom();
          this.zoom = zoom;
          this.debounceApplyGetCoverageData();
        },
      },
      plugins: [{
        pName: 'Scale',
        position: 'LB',
        events: {}
      }, {
        pName: 'ToolBar',
        position: 'RB',
        direction: false,
        liteStyle: true,
        locate: false,
      }],
    };
  },
  computed: {
    rectLabelDataList() {
      const {
        coverageList, amap, cityList
      } = this;
      return coverageList.reduce((retArr, coverage, idx) => {
        const color = colorList[idx];
        const { dataModel } = coverage;
        const { currentUsedDataParams } = dataModel;
        if (!currentUsedDataParams) return retArr;
        const list = dataModel.currentUsedData || [];
        list.forEach((item) => {
          const onePolygon = {
            position: [item.lat, item.lon],
            content: `<div class="rect-label-mark-wrapper" style="background:${color}">${item.count}</div>`,
            offset: [0, 0],
            events: {
              click: (data) => {
                console.log('data', data);
                const nextLevel = getNextLevelZoom(currentUsedDataParams.adminLevel);
                if (nextLevel) {
                  if (nextLevel.level === 'country') {
                    const target = cityList.find((city) => city.adminCode === item.adminCode);
                    if (target) this.city = target;
                  }
                  amap.setCenter([item.lat, item.lon]);
                  amap.setZoom(nextLevel.range[0]);
                }
              }
            }
          };
          retArr.push(onePolygon);
        });
        return retArr;
      }, []);
    },
  },
  created() {
    window.map = this;
    this.debounceApplyGetCoverageData = debounce((notResetRenderData) => {
      this.applyGetCoverageData(notResetRenderData);
    }, 200);
    this.initCityList();
  },
  methods: {
    initCityList() {
      svs.getCityList().then((cityList) => {
        this.cityList = cityList;
        [this.city] = cityList;
      });
    },
    coverageChangeHandle(coverage) {
      const { coverageList } = this;
      if (coverage.checked) {
        if (coverageList.indexOf(coverage) === -1) {
          this.initOneCoveragDataModel(coverage);
          coverageList.push(coverage);
          this.getCoverageData(coverage);
        }
      } else {
        const idx = coverageList.indexOf(coverage);
        if (idx > -1) {
          this.clearOneCoveragDataModel(coverage);
          coverageList.splice(idx, 1);
        }
      }
    },
    applyGetCoverageData(notResetRenderData) {
      if (!this.amap) return;
      this.coverageList.forEach((coverage) => {
        this.getCoverageData(coverage, notResetRenderData);
      });
    },
    getCoverageData(coverage, notResetRenderData) {
      if (this.needRequestValidate(coverage)) {
        const params = this.getCoverageRequestParams(coverage);
        if (!notResetRenderData) this.applyResetRenderData(coverage);
        const dataCacher = cacheMap.get(coverage);
        // 模拟axios CancelToken.source();
        const def = defer();
        dataCacher.setClearDataHandle(params, () => {
          def.resolve();
        });
        dataCacher.setData(params, 'isLoading', true);
        svs.queryData(params, { cancelToken: def.promise })
          .then((data) => {
            console.log('queryData:', data);
            this.coverageDataSave(coverage, params, data);
          }, (e) => {
            console.log('queryData error:', e);
          }).finally(() => {
            dataCacher.setData(params, 'isLoading', false);
          });
      } else {
        this.applyPrepareRenderData(coverage);
      }
    },
    needRequestValidate(coverage) {
      // 高德地图还未初始化时不用请求数据
      if (!this.amap) return false;
      const dataCacher = cacheMap.get(coverage);
      if (!dataCacher) return true;
      const newRequestParams = this.getCoverageRequestParams(coverage);
      const mapData = dataCacher.getData(newRequestParams, 'data');
      const isLoading = dataCacher.getData(newRequestParams, 'isLoading');
      if (!mapData && !isLoading) return true;
      return false;
    },
    clearOneCoveragDataModel(coverage) {
      const dataCacher = cacheMap.get(coverage);
      if (dataCacher)dataCacher.clearData();
    },
    initOneCoveragDataModel(coverage) {
      const dataModel = {
        currentUsedData: null,
        currentUsedDataParams: null,
      };
      const dataCacher = new DataCacher();
      cacheMap.set(coverage, dataCacher);
      this.$set(coverage, 'dataModel', dataModel);
    },
    getCoverageRequestParams(coverage) {
      const adminLevel = getAdminLevel(this.zoom);
      const { keyWord } = coverage;
      const { time } = this;
      const params = {
        keyWord,
        time,
        adminLevel,
      };
      if (adminLevel === 'country') {
        params.city = this.city.adminCode;
      }
      return params;
    },
    coverageDataSave(coverage, params, data) {
      const dataCacher = cacheMap.get(coverage);
      dataCacher.setData(params, 'data', data);
      this.applyPrepareRenderData(coverage);
    },
    applyPrepareRenderData(coverage) {
      const { dataModel } = coverage;
      const params = this.getCoverageRequestParams(coverage);
      const dataCacher = cacheMap.get(coverage);

      const data = dataCacher.getData(params, 'data');
      if (data) {
        dataModel.currentUsedDataParams = params;
        dataModel.currentUsedData = data;
      } else {
        dataModel.currentUsedDataParams = null;
        dataModel.currentUsedData = null;
      }
    },
    applyResetRenderData(coverage) {
      coverage.dataModel.currentUsedData = {};
      coverage.dataModel.currentUsedDataParams = null;
    },
    timeChange() {
      this.applyGetCoverageData();
    },
    getIndicatorColor(coverage) {
      const idx = this.coverageList.indexOf(coverage);
      if (idx > -1) {
        return colorList[idx];
      }
      return null;
    },
    cityChangeHandle(city) {
      this.amap.setCenter([city.lat, city.lon]);
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.amap-wrapper {
  height: 100%;
  width: 100%;
}
.left-panel{
 position: absolute;
 top: 10px;
 left: 10px;
 background: #fff;
 padding: 5px 10px;
 border-radius: 4px;
 min-width: 250px;
 height: 300px;
}
.top-panel{
  position: absolute;
  background: #fff;
  top: 10px;
  left: 300px;
  border-radius: 4px;
  padding: 8px 15px;
}
/deep/.rect-label-mark-wrapper{
  font-size: 12px;
  min-width: 30px;
  height: 18px;
  text-align: center;
  line-height: 18px;
  color: #fff;
  border-radius: 2px;
  padding: 0 2px;
}
.el-checkbox{
  width:100%;
}
.checkbox-row{
  width: 220px;
  display: flex;
}
.checkbox-text{
  flex-grow: 1;
}
.color-indicator{
  width: 40px;
  height: 19px;
  border-radius: 4px;
}
</style>

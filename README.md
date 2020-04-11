# race-condition-demo

# 以一个具体的案例介绍在前端开发中如何建立模型去协调复杂的竞态条件

## 竞态条件介绍
>- [竞争危害 (race hazard) 又名竞态条件 (race condition)。旨在描述一个系统或者进程的输出展现无法预测的、对事件间相对时间的排列顺序的致命相依性。](https://baike.baidu.com/item/%E7%AB%9E%E4%BA%89%E5%8D%B1%E5%AE%B3/3525767?fromtitle=%E7%AB%9E%E6%80%81%E6%9D%A1%E4%BB%B6&fromid=1321097&fr=aladdin)
>-  常见的协调竞态条件的案例[化解使用 Promise 时的竞态条件](https://efe.baidu.com/blog/defusing-race-conditions-when-using-promises/)

## 复杂问题场景
[demo地址](http://senmao.gitee.io/race-condition-demo/)

### 功能简述
- 在地图中展示不同`聚合级别`的业务数据。
- 地图级别分为`1~20`级，级别数值越大当前地图的比例尺越小。
- 地图不同级别展示不同级别聚合的数据，比如`1~6级`展示按`行政省`聚合的数据，`7~12级`展示按`行政市`聚合的数据，`13~20级`展示`行政区县`聚合的数据。
- 用户选择了`专题图层`,时根据当前地图的聚合级别请求相应聚合级别的聚合数据，并且在地图中渲染。
- 获取`行政省`,`行政市`级别聚合的数据时，加上`数据更新时间`的查询条件，获取`行政区县`级别聚合的数据时还要额外加上`城市`过滤条件。
- 当用户进行地图的缩放时，如果需要展示的数据的`聚合级别`改变了则加载相应的数据并渲染。

### 竞态条件分析
- 用户选择了一个`专题图层`后，触发数据的获取。比如当前地图级别为`6级`,此时应该异步获取按照`行政省`级别聚合的数据。如果获取按照`行政省`级别聚合数据的请求得到响应之前，用户就切换到地图`7级`,此时应该请求按`行政市`级别聚合的数据。如果用户停留在地图`7级`时，获取按照`行政省`级别聚合数据的请求得到响应了，此数据不应该在界面被渲染出来。

### 细节功能点
- 用户选择了一个`专题图层`后，触发数据的获取。比如当前地图级别为`6级`,此时应该异步获取按照`行政省`级别聚合的数据。如果获取按照`行政省`级别聚合数据的请求得到响应之前，用户就切换到地图`7级`，并且又切回到地图`6级`，也不应该重复请求按照`行政省`聚合的数据。
- 当用户取消选中了一个`专题图层`时，获取这个`专题图层`数据的仍在pending状态的请求应该被cancel。

### 问题思考
- 这里的异步请求的请求条件是不确定的
- 比如请求按照`行政省`级别聚合的数据时查询字段可能是
```js
{
 keyWord,//图层名称
 time,
 adminLevel,// 聚合方式
}
```
- 请求按照`行政市`级别聚合的数据时查询字段可能是
```js
{
 keyWord,
 time,
 adminLevel,
 city, // 城市
}
```
- 同一时刻处于pengding状态的异步请求的个数是不确定的
- 如果异步请求得到响应了，但是界面当前的状态和触发请求时使用的状态不一致时，数据不应该被丢弃。否则用户在地图`6级`和`7级`之间来回切换时，地图可能永远不会渲染出来数据。
- 所以不能用这种方式来简单的去协调竞态条件
```js
ArticleStore.fetch(id).then((article) => {
  // 校验应用的状态:
  if (this.props.articleID !== id) return;

  this.setState({
    title: article.title,
    body: article.body
  });
});
```

### 建立模型
![](https://user-gold-cdn.xitu.io/2020/4/8/1715a75745f32b51?w=2142&h=1743&f=png&s=322906)

### 具体实现

- 数据缓存器的实现
> [data-cacher](https://www.npmjs.com/package/data-cacher)
- 函数功能逻辑提取
```js
/**
 * applyGetCoverageData - 请求获取相应的地图数据,使用场景time、图层、地图zoom、地图实例改变;
 * getCoverageData - 获取当前需要的数据;
 * needRequestValidate - 判断是否需要发起请求 getCoverageData函数调用;
 * getCoverageRequestParams-  构造用于请求（查询）的参数;
 * clearOneCoveragDataModel - cancel仍在pending的请求，图层被移除前调用，或者图层数据被完全初始化时调用;
 * initOneCoveragDataModel - 初始化数据模型
 * coverageDataSave - 将接口返回的数据存储到本地,数据请求响应时调用
 * applyPrepareRenderData - 准备用于渲染的数据
 *
 */
```
- [功能实现源码](https://github.com/Semlaw/race-condition-demo)
- [实现效果](http://senmao.gitee.io/race-condition-demo/)


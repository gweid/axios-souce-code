'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var mergeConfig = require('./core/mergeConfig');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
// instance 是一个函数 Axios.prototype.request，而且执行上下文绑定到 context = new Axios(defaultConfig)
// instance 有 Axios.prototype 上的所有方法，还有 Axios 实例对象上的属性 defaults 和 interceptors
function createInstance(defaultConfig) {
  /* 
  创建Axios的实例
      原型对象上有一些用来发请求的方法: get()/post()/put()/delete()/request()
      自身上有2个重要属性: defaults/interceptors
  */
  //  function Axios(instanceConfig) {
  //   // 将指定的 config, 保存为 defaults 属性
  //   this.defaults = instanceConfig;
  //   // 将包含请求/响应拦截器管理器的对象保存为 interceptors 属性
  //   this.interceptors = {
  //     request: new InterceptorManager(),
  //     response: new InterceptorManager()
  //   };
  // }
  var context = new Axios(defaultConfig);

  // axios 和 axios.create() 对应的就是 request 函数
  // instance = Axios.prototype.request.bind(context)
  // 将 Axios.prototype.request 的执行上下文绑定到 context
  var instance = bind(Axios.prototype.request, context); // axios

  // 将 Axios 原型对象上的方法拷贝到 instance 上: request()/get()/post()/put()/delete()
  // 所以有 axios.get 等方法，
  // 调用的是 Axios.prototype 上的方法
  utils.extend(instance, Axios.prototype, context);

  // 将 Axios 实例对象上的属性拷贝到 instance上: defaults 和 interceptors 属性
  // 这就是默认配置 axios.defaults 和拦截器  axios.interceptors 可以使用的原因
  // 其实是 new Axios().defaults 和 new Axios().interceptors
  utils.extend(instance, context);

  // 相当于返回 Axios.prototype.request.bind(context)
  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// 下面是往 axios 实例化的对象增加不同的方法
// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Factory for creating new instances
// 工厂模式 创建新的实例 用户可以自定义一些参数
axios.create = function create(instanceConfig) {
  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;
'use strict';

var utils = require('./../utils');
var buildURL = require('../helpers/buildURL');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var mergeConfig = require('./mergeConfig');

/**
 * Axios 构造函数
 * Create a new instance of Axios
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  // 将指定的 config, 保存为 defaults 属性
  this.defaults = instanceConfig;
  // 将包含请求/响应拦截器管理器的对象保存为 interceptors 属性
  this.interceptors = {
    // function InterceptorManager() {
    //   // 用来保存拦截器函数的数组, 数组中每个都是对象, 对象中包含fulfilled/rejected方法
    //   this.handlers = [];
    // }
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * 用于发请求的函数
 * 我们使用的 axios 就是此函数 bind() 返回的函数
 * 
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  // 进行配置合并
  config = mergeConfig(this.defaults, config);
  // 请求方式, 默认为 get
  config.method = config.method ? config.method.toLowerCase() : 'get';

  /*
  创建用于保存请求/响应拦截函数的数组
  数组的中间放发送请求的函数
  数组的左边放请求拦截器函数(成功/失败)
  数组的右边放响应拦截器函数
  */
  var chain = [dispatchRequest, undefined];
  // 生成一个成功的 promise 对象
  var promise = Promise.resolve(config);

  // 请求拦截添加进数组后添加的请求拦截器保存在数组的前面
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });
  // 后添加的响应拦截器保存在数组的后面
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  // 在使用拦截的时候，如果不传 fulfilled 或者 rejected，那么就会是 undefined
  // InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  //   // 添加成功和失败的拦截器函数
  //   this.handlers.push({
  //     fulfilled: fulfilled,
  //     rejected: rejected
  //   });
  //   // 返回拦截器对应的ID(也就是下标)
  //   return this.handlers.length - 1;
  // }

  // 最终的结果
  // var chain = [
  //   '请求成功拦截2', '请求失败拦截2',  
  //   '请求成功拦截1', '请求失败拦截1',  
  //   dispatchRequest, undefined,
  //   '响应成功拦截1', '响应失败拦截1',
  //   '响应成功拦截2', '响应失败拦截2',
  // ]


  // 通过 promise 的 then() 串连起所有的请求拦截器/请求方法/响应拦截器
  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
    // 第一次后得到的 paomise 是 promise.then(chain.shift(), chain.shift())
    // 继续循环，此时的 promise 已经是 promise.then(chain.shift(), chain.shift())，那么再执行 then 就是 promise.then(chain.shift(), chain.shift())。.then(chain.shift(), chain.shift())
    // ... 依次类推，最后会形成如下
    // promise
    //   .then('请求成功拦截2', '请求失败拦截2')
    //   .then('请求成功拦截1', '请求失败拦截1')
    //   .then(dispatchRequest, undefined)
    //   .then('响应成功拦截1', '响应失败拦截1')
    //   .then('响应成功拦截2', '响应失败拦截2')
    //   .then('用户写的业务处理函数')
    //   .catch('用户写的报错业务处理函数');
  }

  // 返回用来指定 onResolved 和 onRejected 的 promise
  return promise;
};

// 用来得到带 query 参数的 url
Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
// 给 Axios.prototype 上添加 'delete', 'get', 'head', 'options'
// 所以使用时可以 axios.get() ... 这样
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function (url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});
// 给 Axios.prototype 上添加 'post', 'put', 'patch'
// 所以使用时可以 axios.post() ... 这样
utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function (url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;
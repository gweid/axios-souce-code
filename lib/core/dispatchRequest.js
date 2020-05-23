'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
var combineURLs = require('./../helpers/combineURLs');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
// 请求取消时
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
// 适配器：请求调度的地方，即调用请求方法的地方
// 这里的 config 是由 promise 链式调用一路传下来的
// var promise = Promise.resolve(config);
// while (chain.length) {
//   promise = promise.then(chain.shift(), chain.shift());

//   // promise
//   //   .then('请求成功拦截1', '请求失败拦截1')
//   //   .then(dispatchRequest, undefined)
//   //   .then('响应成功拦截1', '响应失败拦截1')
// }
module.exports = function dispatchRequest(config) {

  /* 
  如果请求已经被取消, 直接抛出异常
  */
  throwIfCancellationRequested(config);

  /* 
  合并config中的baseURL和url
  */
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Ensure headers exist
  config.headers = config.headers || {};

  /* 
  对config中的data进行必要的转换处理
  设置相应的Content-Type请求头
  */
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  /* 
  整合config中所有的header
  */
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    /* 
    对response中还没有解析的data数据进行解析
    json字符串解析为js对象/数组
    */
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

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
  合并 config 中的 baseURL 和 url
  */
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Ensure headers exist
  config.headers = config.headers || {};

  /* 
  对 config 中的 data 进行必要的转换处理
  设置相应的 Content-Type 请求头
  */
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  /* 
  整合 config 中所有的 header
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

  // 请求的适配器，支持自定义：config.adapter   或者默认：defaults.adapter
  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    /* 
    对 response 中还没有解析的data数据进行解析
    json 字符串解析为 js 对象/数组
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

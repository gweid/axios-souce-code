'use strict';

var utils = require('./utils');
var normalizeHeaderName = require('./helpers/normalizeHeaderName');

// 默认的 Content-Type 头的值
var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

// adapter 就是 ajax 请求的封装
function getDefaultAdapter() {
  var adapter;
  // Only Node.JS has a process variable that is of [[Class]] process
  if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    // 如果是 node 环境，就通过 node http 的请求方法
    adapter = require('./adapters/http');
  } else if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    // 如果是浏览器环境，就通过 ajax
    adapter = require('./adapters/xhr');
  }
  return adapter;
}

var defaults = {
  // 得到当前环境对应的请求适配器
  adapter: getDefaultAdapter(),

  // 请求转换器
  transformRequest: [function transformRequest(data, headers) {
    // 指定 headers 中更规范的请求头属性名
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');


    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    // 如果 data 是对象, 指定请求体参数格式为 json, 并将参数数据对象转换为 json
    if (utils.isObject(data)) {
      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
      return JSON.stringify(data);
    }
    return data;
  }],

  // 响应数据转换器: 解析字符串类型的 data 数据
  transformResponse: [function transformResponse(data) {
    /*eslint no-param-reassign:0*/
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) { /* Ignore */ }
    }
    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  // 防御 csrf 攻击
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,

  // 判断响应状态码的合法性: [200, 299]
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  // 包含所有通用的请求的对象
  common: {
    'Accept': 'application/json, text/plain, */*'
  }
};

// 指定 delete/get/head 请求方式的请求头容器对象
utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

// 指定 post/put/patch 请求方式的请求头容器对象
utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  // 指定了默认的 Content-Type 头
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;

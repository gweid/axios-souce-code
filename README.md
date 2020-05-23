# axios 源码阅读

整体流程

![axios流程](/imgs/img1.png)

**源码阅读注释在各个源码文件中**

**问题：**

1.为什么 axios 既可以当函数调用 axios({})，也可以当对象使用 axios.get

axios 本质是一个函数，所以可以当函数使用，而 axios.get 这些方法是通过给 axios 原型上拓展的方法

2.axios 的取消功能

**axios 提供两种取消请求方式**

-   通过 axios.CancelToken.source 生成取消令牌 token 和取消方法 cancel

```
const CancelToken = axios.CancelToken;
const source = CancelToken.source();

axios.get('/user/12345', {
  cancelToken: source.token
}).catch(function(thrown) {
  if (axios.isCancel(thrown)) {
    console.log('Request canceled', thrown.message);
  } else {
    // handle error
  }
});

axios.post('/user/12345', {
  name: 'new name'
}, {
  cancelToken: source.token
})

// cancel the request (the message parameter is optional)
source.cancel('Operation canceled by the user.');
```

-   通过 axios.CancelToken 构造函数生成取消函数

```
const CancelToken = axios.CancelToken;
let cancel;

axios.get('/user/12345', {
  cancelToken: new CancelToken(function executor(c) {
    // An executor function receives a cancel function as a parameter
    cancel = c;
  })
});

cancel();
```

**axios 取消请求原理**

通过传递 config 配置 cancelToken 的形式，如果有 cancelToken，在 promise 链式调用的 dispatchRequest 抛出错误，在 adapter 中的 xhr 的 request.abort() 取消请求，使 promise 走向 rejected，被用户捕获取消信息

```
// dispatchRequest.js

function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

module.exports = function dispatchRequest(config) {

  // 如果请求已经被取消, 直接抛出异常
  throwIfCancellationRequested(config)

  ...
}

// xhr.js
module.exports = function xhrAdapter(config) {
  
  var request = new XMLHttpRequest();
  ...

  // 如果配置了cancelToken
  if (config.cancelToken) {
    // 指定用于中断请求的回调函数
    config.cancelToken.promise.then(function onCanceled(cancel) {
      if (!request) {
        return;
      }
      // 中断请求
      request.abort();
      // 让请求的promise失败
      reject(cancel);
      // Clean up request
      request = null;
    });
  }

  ...
};
```

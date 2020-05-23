# axios 源码阅读

整体流程

![axios流程](/imgs/img1.png)

**源码阅读注释在各个源码文件中**

**问题：**

1.为什么 axios 既可以当函数调用，也可以当对象使用，比如 axios({})、axios.get

axios 本质是一个函数，所以可以当函数使用，而 axios.get 这些方法是通过给 axios 原型上拓展的方法

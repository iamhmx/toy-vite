<img src="https://github.com/iamhmx/toy-vite/public/toy-vite.png">

# toy-vite

### 概念

Vite，一个基于浏览器原生 ES imports 的开发服务器。

### 原理

浏览器解析 type='module' 的 script 时，会发送 http 请求，vite 拦截此请求，将需要的模块编译返回。

### 优点

- 不用打包，直接编译返回，速度快
- 天生懒加载，按需编译
- 支持 HMR

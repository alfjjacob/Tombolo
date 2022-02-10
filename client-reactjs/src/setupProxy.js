const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('PROXY_URL: '+ process.env.REACT_APP_PROXY_URL);
  app.use(createProxyMiddleware('/api', { target: process.env.REACT_APP_PROXY_URL }));
};

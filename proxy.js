const fs = require('fs');
const express = require('express');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');

const app = express();

var port = process.argv[2];
console.log("Port:", port);

var target = process.argv[3];
console.log("Target:", target);

app.use("/", createProxyMiddleware({
    target: target,
    changeOrigin: true,

    selfHandleResponse: true, // res.end() will be called internally by responseInterceptor()

    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        if (!proxyRes.headers["content-type"].startsWith("application/json")) {
            return responseBuffer;
        }

        const exchange = `${req.method} ${req.path} -> ${proxyRes.req.protocol}//${proxyRes.req.host}${proxyRes.req.path} [${proxyRes.statusCode}]`;
        console.log(exchange);

        const cacheKey = req.method + "|" + proxyRes.req.path;
        const cacheFileName = "response_cache/" + Buffer.from(cacheKey).toString("base64") + ".json";
        console.log("-> Cache key:", cacheKey);
        console.log("-> Cache file name:", cacheFileName);

        let response = null;
        if (res.statusCode >= 400 && fs.existsSync(cacheFileName)) {
            response = fs.readFileSync(cacheFileName);
        } else {
            response = responseBuffer.toString("utf8");
            fs.writeFileSync(cacheFileName, response);
        }

        return response;
    }),
}));

app.listen(port);

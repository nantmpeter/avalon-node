/**
 * @fileoverview
 * @author Harry <czy88840616@gmail.com>
 *
 */

var Template = require('../webx/template'),
    info = require('../webx/info'),
    _ = require('underscore'),
    webUtil = require('../util/util'),
    userCfg = require('../config/userConfig'),
    httpProxy = require('http-proxy'),
    proxy = new httpProxy.RoutingProxy(),
    cp = require("child_process");

//var phpProcess = cp.spawn("php", [
//    '-S', 'localhost:8000',
//    '-t',  'D:\\cuxiao'
//], {
//    cwd: 'D:\\tools\\php'
//});

module.exports = {
    render: function(req, res){
        proxy.proxyRequest(req, res, {
            host: '127.0.0.1',
            port: 8000
        });
    }
};
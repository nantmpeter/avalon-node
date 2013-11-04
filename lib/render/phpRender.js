/**
 * @fileoverview
 * @author Harry <czy88840616@gmail.com>
 *
 */

var phpController = require('../php/phpController'),
    httpProxy = require('http-proxy'),
    proxy = new httpProxy.RoutingProxy();

module.exports = {
    render: function(req, res){
        phpController.checkEnv();
        proxy.proxyRequest(req, res, {
            host: '127.0.0.1',
            port: 8803
        });
    }
};
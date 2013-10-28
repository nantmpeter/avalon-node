/*
 * WEB ROUTES
 */
var webUtil = require('../../../lib/util/util'),
    path = require('path'),
    fs = require('fs'),
    _ = require('underscore'),
    userCfg = require('../../../lib/config/userConfig'),
    snapCfg = require('../../../lib/config/snapConfig'),
    render = require('../../../lib/render'),
    request = require('request'),
    url = require('url'),
    comboParser = require('combo-url-parser'),
    async = require('async'),
    Env = require('../../../lib/env'),
    argv = require('optimist').argv,
    httpProxy = require('http-proxy'),
    proxy = new httpProxy.RoutingProxy();

var contentType = {
    '.js':'application/x-javascript;',
    '.css':'text/css;',
    '.swf':'application/x-shockwave-flash;',
    '.png': 'image/png;',
    '.gif': 'image/gif;',
    '.jpg': 'image/jpeg;',
    '.ico': 'image/x-icon;',
    '.less': 'text/css;',
    '.scss': 'text/css;'
};

var processUrl = function(uri, domain,  callback){
    var rules = userCfg.get('rules'),
        isMatch = false,
        matchRule;

    _.each(rules, function(rule){
        if(!isMatch && rule.enable) {
            var pattern = new RegExp(rule.pattern, 'g');
            if(pattern.test(uri)) {
                uri = uri.replace(pattern, rule.target);
                matchRule = rule;
                isMatch = true;
            }
        }
    });

    callback(uri, matchRule);
};

exports.index = function (req, res, next) {
    //反向代理bugfix
    var host = req.headers['x-forwarded-host'] || req.headers['X-Forwarded-For']|| req.headers.host || '',
        debug = userCfg.get('debug');

    if(host.indexOf('127.0.0.1') == -1 && host.indexOf('localhost') == -1
        && (/\.(css|js|ico|png|jpg|swf|less|gif|woff|scss)/.test(req.url) || req.url.indexOf("??") != -1)) {

        if('httpx' == userCfg.get('proxyType')) {
            proxy.proxyRequest(req, res, {
                host: '127.0.0.1',
                port: argv.proxyPort || Env.proxyPort
            });
        } else {
            //走本身的代理
            var paths;
            //combo
            if(req.url.indexOf('??') != -1) {
                var p =  url.parse(req.url);
                paths = comboParser(p.path);
            } else {
                paths = [req.url];
            }

            res.setHeader('Content-type', contentType[path.extname(paths[0].replace(/\?.*/, ''))]);

            async.forEachSeries(paths, function(p, callback){
                processUrl(p, host, function(uri, rule){
                    if(webUtil.isLocalFile(uri, debug)) {
                        uri = uri.replace(/\?.*/, '');

                        if(fs.existsSync(uri)) {
                            var stream = fs.createReadStream(uri);

                            stream.pipe(res, { end: false });
                            stream.on('end', callback);
                            stream.on('error', callback);
                        } else {
                            res.statusCode = 404;
                            res.write('这个文件真的不存在，404了哦，查找的文件是：' + uri);
                            res.end();
                        }
                    } else {
                        uri = 'http://proxy.taobao.net' + uri;
                        request.get({
                            url:  uri,
                            qs: {
                                domain: host
                            },
                            encoding: null
                        }, function (error, response, body) {
                            if(error) {
                                res.write(error.toString() + ', uri=http://' + uri);
                            }

                            if(!response) {
                                console.log('connect fail: ' + uri);
                            } else if(response.statusCode == 200) {
                                res.write(body);
                            } else if(response.statusCode == 404) {
                                res.statusCode = 404;
//                            res.setHeader('Content-type', 'text/html');
                                error && console.log(error);
                                res.write('<h1>这个文件真的不存在，404了哦</h1>给你看看错误信息<div><textarea style="width:600px;height:400px">' +
                                    (error ? error.toString(): body) +
                                    '</textarea></div><hr>Powered by Vmarket');
                            }
                            callback(error);
                        });
                    }
                });
            }, function(err){
                res.end();
            });
        }
    } else {
        next();
    }
};
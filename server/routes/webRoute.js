/*
 * WEB ROUTES
 */
var webx = require('../../lib/webx/webx'),
    webUtil = require('../../lib/util/util'),
    webxUtil = require('../../lib/util/webxUtil'),
    path = require('path'),
    fs = require('fs'),
    _ = require('underscore'),
    userCfg = require('../../lib/config/userConfig'),
    snapCfg = require('../../lib/config/snapConfig'),
    innerData = require('../../lib/webx/innerData'),
    info = require('../../lib/webx/info'),
    request = require('request'),
    Env = require('../../lib/env'),
    argv = require('optimist').argv,
    url = require('url');

var checkUpdate = function () {
    //大于3天升级
    return new Date().getTime() - userCfg.get('lastCheckTime') >= 259200000;
};

//首页
exports.index = function (req, res) {
    res.render('index', {
        apps: _.keys(userCfg.get('apps')),
        use: userCfg.get('use'),
        common: userCfg.get('common'),   //vmcommon这类公共资源
        commonValues: !userCfg.get('type') ? [] : innerData.data.companys[userCfg.get('type')].common,
        open: userCfg.get('open'),
        type: userCfg.get('type'),
        companys: _.keys(innerData.data.companys),
        debug: userCfg.get('debug'),
        api: userCfg.get('api'),
        apis: innerData.data.apis,
        checkUpgrade: checkUpdate()
    });
};

//list页面和应用详情页
exports.list = function (req, res) {
    var appname = req.params.appname,
        apps = userCfg.get('apps');
    if (appname && apps[appname]) {
        webx.getScreenUrl(apps[appname], function (err, result) {
            res.render('appDetail', {
                appname: appname,
                data: apps[appname],
                urls: result,
                type: userCfg.get('type'),
                extraControlList: apps[appname]['extraControls'],
                checkUpgrade: checkUpdate()
            });
        });
    } else {
        res.render('appList', {
            apps: _.keys(apps),
            type: userCfg.get('type'),
            checkUpgrade: checkUpdate()
        });
    }
};

//页面详情页
exports.detail = function (req, res) {
    var useApp = userCfg.get('use');
    var config = webUtil.merge({}, userCfg.get('apps')[useApp]);
    config.type = userCfg.get('type');
    config.common = userCfg.get('common');

    info.collectInfo({
        app: useApp,
        config: config,
        target: webxUtil.formatUrl(req.url)
    }, function (err, obj) {
        if (err || _.isEmpty(obj)) {
            res.render('404', {
                app: useApp
            });
        } else {
            res.render('pageDetail', webUtil.merge(obj, {
                checkUpgrade: checkUpdate()
            }));
        }
    });
};

//代理页面
exports.proxy = function (req, res, next) {
    var proxyType = userCfg.get('proxyType');

    if ('httpx' == proxyType) {
        res.redirect('http://127.0.0.1:' + argv.proxyPort || Env.proxyPort);
    } else {
        res.render('proxy', {
            proxyDomain: userCfg.get('proxyDomain'),
            rules: userCfg.get('rules'),
            checkUpgrade: checkUpdate()
        });
    }
};
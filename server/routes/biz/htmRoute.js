/*
 * WEB ROUTES
 */
var url = require('url'),
    path = require('path'),
    vmRender = require('../../../lib/render/vmRender'),
    snapRender = require('../../../lib/render/snapRender'),
    phpRender = require('../../../lib/render/phpRender'),
    userCfg = require('../../../lib/config/userConfig'),
    bodyParser = require('express').bodyParser();

exports.index = function (req, res, next) {
    var type = path.extname(url.parse(req.url).pathname);

    if(type == '.htm' || type == '.do') {
        bodyParser(req, res, function() {
            vmRender.render(req, res);
        });
    } else if(type == '.snap') {
        bodyParser(req, res, function() {
            snapRender.render(req, res);
        });
    } else if(type == '.php') {
        phpRender.render(req, res);
    } else if(type == "") {
        //如果没有后缀，那要判断下当前的所属的环境，来指派给谁处理
        var apps = userCfg.get('apps'),
            use = userCfg.get('use');

        if(apps[use].type == 'php') {
            phpRender.render(req, res);
        } else {
            next();
        }
    } else {
        next();
    }
};
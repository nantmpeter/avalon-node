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
    snapCfg = require('../config/snapConfig');

var getTarget = function(p) {
    var t =  p.split('/'),
        oldNames = t.pop().split('_'),
        newNames = [];

    _.each(oldNames, function(v, idx) {
        if(idx != 0) {
            newNames.push(v.substring(0, 1).toUpperCase() + v.substring(1));
        } else {
            newNames.push(v);
        }
    });

    t.push(newNames.join(''));

    return t.join('/') + '.vm';
};

module.exports = {
    getInfo: function(cfg, callback) {
        cfg.target = getTarget(cfg.path);

        info.collectInfo(cfg, callback);
    },
    render: function(req, res){
        //这里编码就取当前使用的应用编码
        var useApp = userCfg.get('use'),
            config = webUtil.merge({}, userCfg.get('apps')[useApp]);

        //真正的渲染
        config.type = userCfg.get('type');
        config.common = userCfg.get('common');

        var template = new Template({
            target: getTarget(req.params[0]),
            app: useApp,
            config: config,
            path: req.params[0],
            api: userCfg.get('api'),
            parameters: req.method == 'GET' ? req.query : req.body
        });

        if(template && template.target) {
            template.render(req, res);
        } else {
            res.render('404', {
                app:useApp,
                url: req.url
            });
        }
    }
};
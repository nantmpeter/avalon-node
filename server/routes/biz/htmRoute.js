/*
 * WEB ROUTES
 */
var webUtil = require('../../../lib/util/util'),
    userCfg = require('../../../lib/config/userConfig'),
    snapCfg = require('../../../lib/config/snapConfig'),
    request = require('request'),
    iconv = require('iconv-lite'),
    render = require('../../../lib/render');

exports.index = function (req, res, next) {
    //这里编码就取当前使用的应用编码
    var useApp = userCfg.get('use'),
        config = webUtil.merge({}, userCfg.get('apps')[useApp]);

    //真正的渲染
    config.type = userCfg.get('type');
    config.common = userCfg.get('common');

    var template = render.parse({
        app: useApp,
        config: config,
        path: req.params[0],
        api: userCfg.get('api'),
        parameters: req.method == 'GET' ? req.query : req.body
    });

    if(template) {
        template.render(req, res);
    } else {
        res.render('404', {
            app:useApp,
            url: req.url
        });
    }
};
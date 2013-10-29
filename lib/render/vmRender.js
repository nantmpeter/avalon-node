/**
 * @fileoverview
 * @author Harry <czy88840616@gmail.com>
 *
 */

var Template = require('../webx/template'),
    webUtil = require('../util/util'),
    webxUtil = require('../util/webxUtil'),
    userCfg = require('../config/userConfig');

module.exports = {
    render: function(req, res){
        //这里编码就取当前使用的应用编码
        var useApp = userCfg.get('use'),
            config = webUtil.merge({}, userCfg.get('apps')[useApp]);

        //真正的渲染
        config.type = userCfg.get('type');
        config.common = userCfg.get('common');

        var template = new Template({
            target: webxUtil.formatUrl(req.url),
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
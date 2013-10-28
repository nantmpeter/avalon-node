/*
 * WEB ROUTES
 */
var url = require('url'),
    path = require('path'),
    vmRender = require('../../../lib/render/vmRender'),
    snapRender = require('../../../lib/render/snapRender'),
    phpRender = require('../../../lib/render/phpRender');

exports.index = function (req, res, next) {
    var type = path.extname(url.parse(req.url).pathname);

    if(type == '.htm' || type == '.do') {
        vmRender.render(req, res);
    } else if(type == '.php') {
        phpRender.render(req, res);
    } else if(type == '.snap') {
        snapRender.render(req, res);
    } else {
        next();
    }
};
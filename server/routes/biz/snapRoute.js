/*
 * WEB ROUTES
 */
var webUtil = require('../../lib/util/util'),
    userCfg = require('../../lib/config/userConfig'),
    snapCfg = require('../../lib/config/snapConfig'),
    request = require('request'),
    iconv = require('iconv-lite');

exports.index = function (req, res, next) {
    var useApp = userCfg.get('use'),
        config = webUtil.merge({}, userCfg.get('apps')[useApp]);

    request.post('http://v.taobao.net/empty.do', {
        encoding:'utf-8',
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/99999 Safari/537.11"
        }
    }, function (error, response, body) {

    });

    if(req.query['guid']) {
        //快照
        var guid = req.query['guid'],
            snap = snapCfg.getSnapShot(guid) || '';

        if(snap.indexOf('{') == 0) {
            var data = JSON.parse(snap);
            res.render('error', {
                errors:data.errors,
                content:data.content,
                body:snap
            });
        } else {
            var encoding = config['encoding'] || 'gbk';
            if(encoding == 'gbk') {
                res.setHeader('Content-Type','text/html;charset=GBK');
            } else {
                res.setHeader('Content-Type','text/html');
            }
            if(encoding == 'gbk') {
                res.send(iconv.encode(snap, 'gbk') || '');
            } else {
                res.send(snap || '');
            }
        }
    }
};
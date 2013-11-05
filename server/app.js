/**
 * @fileoverview
 * @author Harry Chen <zhangting@taobao.com>
 *
 */

var express = require('express')
    , webRoute = require('./routes/webRoute')
    , appApiRoute = require('./routes/api/appRoute')
    , proxyApiRoute = require('./routes/api/proxyRoute')
    , proxyBizRoute = require('./routes/biz/proxyRoute')
    , htmBizRoute = require('./routes/biz/htmRoute')
    , http = require('http')
    , path = require('path')
    , userCfg = require('../lib/config/userConfig')
    , snapCfg = require('../lib/config/snapConfig')
    , argv = require('optimist').argv
    , webUtil = require('../lib/util/util')
    , cons = require('consolidate')
    , _ = require('underscore')
    , request = require('request')
    , colors = require('colors')
    , Env = require('../lib/env')
    , cp = require('child_process');

var app = express();

app.configure(function () {
    app.set('port', argv.port || Env.port);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'html');
    app.engine('html', cons.jazz);
    app.use(express.favicon());
//    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

var checkConfig = function(req, res, next){
    var apps = userCfg.get('apps');
    if(apps && !_.isEmpty(apps)) {
        next();
    } else {
        res.redirect('/');
    }
};

//页面渲染
app.get('*.vm', checkConfig, webRoute.detail);
app.get('/list/(:appname)?', webRoute.list);
app.get('/', webRoute.index);
app.get('/proxy', webRoute.proxy);

//接口api
app.all('/app/:operate', appApiRoute.operate);
app.post('/proxy/:operate', proxyApiRoute.proxyOperate);

//具体业务逻辑
app.get('(*??*|*.(css|js|ico|png|jpg|swf|less|gif|woff|scss))', proxyBizRoute.index);
app.all('/*', checkConfig, htmBizRoute.index);

http.createServer(app).listen(app.get('port'), function () {
    userCfg.init({
        cfg:argv.cfg || Env.cfg
    });

    snapCfg.init({
        cfg:argv.snapCfg || Env.snapCfg
    });
    console.log('Status:', 'Success'.bold.green);
    console.log("Listen Port： " + app.get('port').toString().cyan);
    console.log("Help：" + "(sudo) vm help".cyan);
    console.log('请使用 '+ 'Control+C'.bold +  ' 来关闭控制台，配置页:http://127.0.0.1' + (app.get('port').toString() === '80' ? '' : ':' + app.get('port')));

    if(userCfg.get('open')) {
        setTimeout(function () {
            webUtil.startWeb('http://127.0.0.1:' + app.get('port'));
        }, 300);
    }

    if('httpx' == userCfg.get('proxyType')) {
        request.get('http://registry.npmjs.org/httpx', function (error, response, body) {
            if(!error) {
                var r = JSON.parse(body);

                cp.exec('tt -v', function(error, stdout, stderr){
                    if (error) {
                        console.log('[Info]'.cyan + ': httpx可更新  => ' + r['dist-tags'].latest.yellow.bold + ',请使用 ' + '(sudo)npm update httpx -g'.bold + ' 进行更新');
                    } else {
                        if(webUtil.trim(stdout) != webUtil.trim(r['dist-tags'].latest)) {
                            console.log('[Info]'.cyan + ': httpx可更新 ' + stdout.replace(/\s/g, '').yellow.bold
                                + ' => ' + r['dist-tags'].latest.yellow.bold + ',请使用 ' + '(sudo)npm update httpx -g'.bold + ' 进行更新');
                        }
                    }
                });
            }
        });

        cp.exec('tt --from vmarket -p ' + (argv.proxyPort || Env.proxyPort), function(error, stdout, stderr){
            if (error) {
                console.log('[httpx error]: ' + error.toString().bold.red);
            }
        });
    }
}).on('error', function(err){
    console.log('Status:', 'Fail'.bold.red);
    console.log('Error:', err.message.toString().bold.red, '可能是端口被占用或者权限不足');
    console.log('请使用 '+ 'Control+C'.bold +  ' 来关闭控制台');
});
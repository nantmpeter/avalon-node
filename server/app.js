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
    , snapBizRoute = require('./routes/biz/snapRoute')
    , http = require('http')
    , path = require('path')
    , render = require('../lib/render')
    , userCfg = require('../lib/config/userConfig')
    , snapCfg = require('../lib/config/snapConfig')
    , argv = require('optimist').argv
    , webUtil = require('../lib/util/util')
    , cons = require('consolidate')
    , _ = require('underscore')
    , url = require('url')
    , fs = require('fs')
    , request = require('request')
    , colors = require('colors')
    , Env = require('../lib/env')
    , async = require('async')
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

//具体业务逻辑
app.get('(*??*|*.(css|js|ico|png|jpg|swf|less|gif|woff|scss))', proxyBizRoute.proxy);
app.all('/*.(*htm*|do)', checkConfig, function(req, res, next){
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
});
app.get('*.snap', checkConfig, snapBizRoute.index);

//页面渲染
app.get('*.vm', checkConfig, webRoute.detail);
app.get('/list/(:appname)?', webRoute.list);
app.get('/', webRoute.index);
app.get('/proxy', webRoute.proxy, function(req,res){
    res.redirect('http://127.0.0.1:' + argv.proxyPort || Env.proxyPort);
});

//接口api
app.all('/app/:operate', appApiRoute.operate);
app.post('/proxy/:operate', proxyApiRoute.proxyOperate);

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
            var r = JSON.parse(body);

            cp.exec('tt -v', function(error, stdout, stderr){
                if (error) {
                    console.log('[Info]'.cyan + ': httpx可更新  => ' + r['dist-tags'].latest.yellow.bold + ',请使用 ' + '(sudo)npm update httpx -g'.bold + ' 进行更新');
                } else {
                    if(stdout != r['dist-tags'].latest) {
                        console.log('[Info]'.cyan + ': httpx可更新 ' + stdout.replace(/\s/g, '').yellow.bold
                            + ' => ' + r['dist-tags'].latest.yellow.bold + ',请使用 ' + '(sudo)npm update httpx -g'.bold + ' 进行更新');
                    }
                }
            });
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
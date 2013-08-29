
/*
 * GET home page.
 */
var webx = require('../../lib/webx/webx'),
    webUtil = require('../../lib/util/util'),
    path = require('path'),
    fs = require('fs'),
    _ = require('underscore'),
    userCfg = require('../../lib/config/userConfig'),
    snapCfg = require('../../lib/config/snapConfig'),
    render = require('../../lib/render'),
    fileUtil = require('../../lib/util/fileUtil'),
    querystring = require('querystring'),
    innerData = require('../../lib/webx/innerData'),
    Env = require('../../lib/env'),
    request = require('request'),
    httpProxy = require('http-proxy'),
    cp = require('child_process'),
    url = require('url');

var App = {
    find: function(params, cb) {
        var type = userCfg.get('type');

        webx.getConfig(params.root, type, function(err, result) {
            if(err) {
                cb(JSON.stringify({success:false, msg:err}));
            } else {
                var data = {
                    tree:webUtil.json2Tree(result, {isLeafParent: true}),
                    subModule:_.keys(result['subModule'])
                };
                cb(err, JSON.stringify({success:true, data:data}));
            }
        });
    },
    load: function() {
        return {
            apps:_.keys(userCfg.get('apps')),
            use:userCfg.get('use'),
            common:userCfg.get('common'),   //vmcommon这类公共资源
            commonValues: !userCfg.get('type') ? []:innerData.data.companys[userCfg.get('type')].common,
            open: userCfg.get('open'),
            type: userCfg.get('type'),
            companys: _.keys(innerData.data.companys),
            debug: userCfg.get('debug'),
            api: userCfg.get('api'),
            apis: innerData.data.apis,
            checkUpgrade: new Date().getTime() - userCfg.get('lastCheckTime') >= 259200000 //大于3天升级
        }
    },
    loadapps: function(params, cb){
        cb(null, {
            apps:_.keys(userCfg.get('apps')),
            use:userCfg.get('use')
        });
    },
    get: function(appName) {
        var json = userCfg.get('apps')[appName];
        return webUtil.json2Tree(json)
    },
    add: function(params, cb){
        var root = params.root,
            encoding = params.encoding,
            type = userCfg.get('type'),
            defaultModule = params.defaultModule;

        root = root.replace(/(\\|\/)$/, '');
        webx.getConfig(root, type, function(err, result) {
            var appName = path.basename(root);
            result.encoding = encoding;
            result.defaultModule = defaultModule;

            var apps = userCfg.get('apps');
            if(apps[appName]) {
                //合并新旧同名应用
                var oldapp = apps[appName];
                result.tools = oldapp.tools || {};
            }

            apps[appName] = result;
            userCfg.set('apps', apps);
            userCfg.set('use', appName);
            userCfg.save(function(err){
                if(err) {
                    cb(null, {success:false,msg:err});
                } else {
                    cb(null, {success:true});
                }
            });
        });
    },
    remove: function(params, cb){
        var appName = params.appName;
        var apps = userCfg.get('apps');
        delete apps[appName];
        userCfg.set('apps', apps);
        var appsNames = _.keys(apps);
        userCfg.set('use', appsNames.length ? appsNames[0] : '');
        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });
    },
    change: function(params, cb) {
        var appName = params.appName;
        userCfg.set('use', appName);
        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });
    },
    setcommon: function(params, cb){
        var key = params.key,
            value = params.value;

        value = value.replace(/(\\|\/)$/, '');
        value = value ? path.resolve(value):value;

        var common = userCfg.get('common');

        if(value == common[key]) {
            //cache
            cb(null, {success:true});
        } else {
            common[key] = value;
            userCfg.set('common', common);
            userCfg.save(function(err){
                if(err) {
                    cb(null, {success:false,msg:err});
                } else {
                    cb(null, {success:true});
                }
            });
        }
    },
    setopen: function(params, cb) {
        var open = params.open === 'true';

        userCfg.set('open', open);
        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });
    },
    settools: function(params, cb){
        var tools = params.tools,
            appname = params.app;

        var apps = userCfg.get('apps');
        apps[appname].tools = tools;
        userCfg.set('apps', apps);

        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });
    },
    removetool: function(params, cb){
        var key = params.toolkey,
            appname = params.app;

        var apps = userCfg.get('apps');
        delete apps[appname].tools[key];
        userCfg.set('apps', apps);

        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });
    },
    loadtools: function(params, cb){
        var appname = params.app;
        var apps = userCfg.get('apps');
        cb(null, {success:true, tools:apps[appname].tools});
    },
    getlastest: function(params, cb){
        var pjson = require('../../package.json');
        request.get('http://registry.npmjs.org/vmarket', function (error, response, body) {
            var r;
            try {
                r = JSON.parse(body);
            } catch(ex) {
                r = {};
                cb(null, {success:false});
                return;
            }

            cb(null, {success:true, current:pjson.version, cfg: r});
        });
    },
    updatechecktime: function(params, cb){
        userCfg.set('lastCheckTime', new Date().getTime());
        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });
    },
    update: function(params, cb){
        var appname = params.app,
            apps = userCfg.get('apps'),
            type = userCfg.get('type'),
            oldapp = apps[appname];

        if(!oldapp) {
            cb(null, {success:false,msg:'当前应用配置不存在'});
        } else {
            var root = oldapp.root;
            webx.getConfig(root, type, function(err, result) {
                var appName = path.basename(root);

                //合并新旧同名应用
                result['tools'] = oldapp['tools'] || {};
                result['encoding'] = oldapp['encoding'];
                result['defaultModule'] = oldapp['defaultModule']; //有可能那个module不是原来那个了，这里有隐患

                apps[appName] = result;
                userCfg.set('apps', apps);
                userCfg.save(function(err){
                    if(err) {
                        cb(null, {success:false,msg:err});
                    } else {
                        cb(null, {success:true});
                    }
                });
            });
        }
    },
    loadsnap: function(params, cb){
        var snaps = snapCfg.getSnapShots(),
            uri = params.uri,
            filterKeys = [],
            filterSnaps = {
                '24hour':[],
                '72hour':[],
                'more':[]
            };

        _.each(_.keys(snaps), function(key){
            var origin = new Buffer(key, 'base64').toString();
            if(origin.indexOf(uri) != -1) {
                var reals = origin.split('_'),
                    p = reals[0],
                    t = parseInt(reals[1]);

                filterKeys.push({
                    t: t,
                    path: p,
                    guid: key,
                    origin: origin
                });
            }
        });

        filterKeys = _.sortBy(filterKeys, function(obj, idx){
            return obj.t;
        }).reverse();

        var base = new Date().getTime();

        //开始循环判断时间间隔
        _.each(filterKeys, function(snap){
            var diff = (base - snap.t)/1000/3600;
            if(diff < 24) {
                filterSnaps['24hour'].push(snap);
            } else if(diff < 72) {
                filterSnaps['72hour'].push(snap);
            } else {
                filterSnaps['more'].push(snap);
            }
        });

        cb(null, {
            success:true,
            snapshots:filterSnaps
        });
    },
    createsnap: function(params, cb) {
        var appname = params.appName,
            uri = params.uri,
            parameters = querystring.parse(params.parameters),
            apps = userCfg.get('apps'),
            type = userCfg.get('type'),
            common = userCfg.get('common');

        var guid = webUtil.createSnapGuid(uri);

        var template = render.parse({
            app: appname,
            config: webUtil.merge(apps[appname], {
                common: common,
                type: type
            }),
            path: uri,
            api: userCfg.get('api'),
            parameters: parameters
        });

        var origin = new Buffer(guid, 'base64').toString(),
            origins = origin.split('_'),
            p = origins[0],
            t = parseInt(origins[1]);

        if(template) {
            template.renderText(function(result){
                snapCfg.setSnapShot(guid, result, function(err){
                    if(err) {
                        cb(null, {success:false,msg:err});
                    } else {
                        cb(null, {
                            success:true,
                            snapshot: {
                                t: t,
                                path: p,
                                guid: guid,
                                origin: origin
                            }
                        });
                    }
                });
            });
        } else {
            snapCfg.setSnapShot(guid, '', function(err){
                if(err) {
                    cb(null, {success:false,msg:err});
                } else {
                    cb(null, {
                        success:true,
                        snapshot: {
                            t: t,
                            path: p,
                            guid: guid,
                            origin: origin
                        }
                    });
                }
            });
        }
    },
    removesnap: function(params, cb){
        var guid = params.guid;

        snapCfg.deleteSnapShot(guid, function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });
    },
    changetype: function(params, cb){
        var type = params.type || 'taobao';
        userCfg.set('type', type);
        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });
    },
    changeapi: function(params, cb){
        var api = params.api || 'http://v.taobao.net/render.do';
        userCfg.set('api', api);
        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });
    },
    savefile: function(params, cb){
        var path = params.path,
            text = params.text,
            apps = userCfg.get('apps'),
            use = userCfg.get('use'),
            encoding = apps[use]['encoding'] || 'gbk',
            err;

        try {
            fileUtil.writeFileSync(path, text, encoding, true);
        } catch(ex) {
            err = ex;
        }

        if(err) {
            cb(null, {success:false,msg:err});
        } else {
            cb(null, {success:true});
        }
    },
    changeLayout: function(params, cb){
        var layout = params.layout,
            target = params.target,
            apps = userCfg.get('apps'),
            use = userCfg.get('use'),
            layouts = apps[use]['layout'] || {};

        if(layout) {
            layouts[target] = layout;
            apps[use]['layout'] = layouts;
        } else {
            layouts[target] && delete layouts[target];
            apps[use]['layout'] = layouts;
        }

        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });

        cb(null, {success: true});
    },
    updateControlGlobal: function(params, cb){
        var isControlGlobal = params.isControlGlobal,
            apps = userCfg.get('apps'),
            use = userCfg.get('use');

        apps[use].isControlGlobal = isControlGlobal;

        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });

        cb(null, {success: true});
    }
};

var proxy = new httpProxy.RoutingProxy();

exports.index = function(req, res){
  res.render('index', App.load());
};

exports.operate = function(req, res){
    var operate = req.params.operate;

    var params = req.method == 'GET' ? req.query : req.body;

    App[operate](params, function(err, result) {
        if(err) {
            res.send(err);
        } else {
            res.send(result);
        }
    });
};

exports.proxy = function(req, res){
    var proxyType = userCfg.get('proxyType');
    if(userCfg.get('debug')) {
        proxyType = 'vmarket';
    }

    if('httpx' == proxyType) {
        res.redirect('http://127.0.0.1:3000');
    } else {
        res.render('proxy', {
            proxyDomain:userCfg.get('proxyDomain'),
            rules:userCfg.get('rules'),
            checkUpgrade: new Date().getTime() - userCfg.get('lastCheckTime') >= 259200000 //大于3天升级
        });
    }
};

var Proxy = {
    addDomain: function(params, cb){
        var domain = params.domain,
            proxyDomain = params.proxyDomain;

        var proxyDomains = userCfg.get('proxyDomain') || {};
        proxyDomains[domain] = proxyDomain;
        userCfg.set('proxyDomain', proxyDomains);

        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });
    },
    removeDomain: function(params, cb){
        var domain = params.domain;

        var proxyDomains = userCfg.get('proxyDomain') || {};
        if(proxyDomains[domain]) {
            delete proxyDomains[domain];
        }

        userCfg.set('proxyDomain', proxyDomains);

        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });
    },
    addRule: function(params, cb){
        var pattern = params.pattern,
            target = params.target,
            charset = params.charset || 'gbk';

        var rules = userCfg.get('rules') || [];
        rules.push({
            pattern: pattern,
            target: target,
            enable: true,
            charset: charset
        });

        userCfg.set('rules', rules);

        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });
    },
    updateRule: function(params, cb){
        var rules = JSON.parse(params.rules) || [];

        userCfg.set('rules', rules);
        userCfg.save(function(err){
            if(err) {
                cb(null, {success:false,msg:err});
            } else {
                cb(null, {success:true});
            }
        });
    },
    checkRule: function(params, cb){
        var rules = userCfg.get('rules') || [],
            proxyDomain = userCfg.get('proxyDomain'),
            checkUrl = params.url,
            err,
            uriObjs;
            result = {};

        if(checkUrl.indexOf('http://') == -1) {
            checkUrl = 'http://' + checkUrl;
        }

        try {
            uriObjs = url.parse(checkUrl);
        } catch(ex) {
            err = '解析url失败';
        }

        if(err){
            cb(err, {success: false});
        } else {
            var domain = uriObjs.hostname;
            _.each(rules, function(rule){
                if(rule.enable) {
                    var uri = checkUrl;
                    var pattern = new RegExp(rule.pattern, 'g');
                    if(pattern.test(checkUrl)) {
                        uri = checkUrl.replace(pattern, rule.target);
                        if(!webUtil.isLocalFile(rule.target)) {
                            uri = uri.replace(domain, proxyDomain[domain]);
                        } else {
                            //过滤时间戳
                            uri = uri.replace(/\?.*/, '');
                            //因为这里的url是完整的url，所以在本地路径下要把域名这部分给干掉 http://assets.daily.taobao.net:3000D:/project/cart/asset
                            uri = uri.replace(uriObjs.protocol + '//' + uriObjs.host, '');
                        }

                        if(_.isUndefined(proxyDomain[domain])) {
                            result[rule.pattern] = uri.replace('undefined', '127.0.0.1');
                        } else {
                            result[rule.pattern] = uri;
                        }
                    }
                }
            });

            cb(null, {success: true, result: result});
        }
    },
    checkUpdateStatus: function(params, cb){
        var step = params.step || 0;
        if(step == 0) {
            //安装httpx
            cp.exec('start npm install httpx -g', function(error, stdout, stderr){
                if (error) {

                } else {

                }
            });

        } else if(step == 1) {
            if(!fs.existsSync(Env.httpxCfg)) {

                var rulePool = {},
                    solutions = {},
                    customSolutionGuid = webUtil.newGuid();

                solutions["GLOBAL"] = {
                    "title":"全局场景",
                    "rules":[
                    ]
                };

                solutions[customSolutionGuid] = {
                    "title":"我的Vmarket场景",
                    "rules":[
                    ]
                };

                //填充rulePool
                var vmarketRules = userCfg.get('rules');

                _.each(vmarketRules, function(rule){
                    var guid = webUtil.newGuid();

                    rulePool[guid] = {
                        title:rule.pattern,
                        pattern:rule.pattern,
                        target:rule.target,
                        type: webUtil.isLocalFile(rule.target) ? 1: 0
                    };

                    //填充solution
                    solutions[customSolutionGuid]['rules'].push({
                        id: guid,
                        enable: rule.enable
                    });
                });

                var newConfig = {
                    rulePool: rulePool,
                    settings: {
                        lastCheckTime: new Date().getTime(),
                        proxyMode: {
                            url: 'proxy.taobao.net',
                            map:{}
                        },
                        useProxyMode: 'url',
                        needHelp: true
                    },
                    solutions: solutions,
                    use: {
                        '127.0.0.1': customSolutionGuid
                    }
                };

                fs.writeFile(Env.httpxCfg, JSON.stringify(newConfig), function(err){
                    if(err) {
                        cb(null, {success: false, msg: 'httpx配置创建失败，升级中止，请重试'});
                    } else {
                        cb(null, {success: true, data: {
                            step: 2
                        }});
                    }
                });
            } else {
                cb(null, {success: true, msg: 'httpx配置已经存在，Vmarket规则将不会覆盖当前httpx的配置', data: {
                    step: 2
                }});
            }
        } else if(step == 2) {
            userCfg.set('proxyType', 'httpx');

            userCfg.save(function(err){
                if(err) {
                    cb(null, {success:false,msg:'Vmarket配置写入失败，升级中止，请重试'});
                } else {
                    cb(null, {success:true, data: {
                        step: 3
                    }});
                }
            });
        }
    }
};

exports.proxyOperate = function(req, res){
    var operate = req.params.operate;

    var params = req.method == 'GET' ? req.query : req.body;

    Proxy[operate](params, function(err, result) {
        if(err) {
            res.send(err);
        } else {
            res.send(result);
        }
    });
};

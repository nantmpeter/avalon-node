/*
 * API ROUTES
 */
var webx = require('../../../lib/webx/webx'),
    webUtil = require('../../../lib/util/util'),
    fileUtil = require('../../../lib/util/fileUtil'),
    path = require('path'),
    fs = require('fs'),
    _ = require('underscore'),
    userCfg = require('../../../lib/config/userConfig'),
    snapCfg = require('../../../lib/config/snapConfig'),
    render = require('../../../lib/render'),
    innerData = require('../../../lib/webx/innerData'),
    request = require('request'),
    querystring = require('querystring'),
    url = require('url');

//app系列

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
        var pjson = require('../../../package.json');
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
    },
    addExtraControl: function(params, cb){
        var extraControlPath = webUtil.trim(params.value),
            apps = userCfg.get('apps'),
            use = userCfg.get('use');

        apps[use].extraControls = apps[use].extraControls || [];

        var modules = apps[use]['subModule'],
            commonModules = userCfg.get('common');

        webx.getControlFormat(extraControlPath, modules, commonModules, function(result) {
            if(result) {
                apps[use].extraControls.push(result);
                userCfg.save(function(err){
                    if(err) {
                        cb(null, {success:false,msg:err});
                    } else {
                        cb(null, {success:true, value: result});
                    }
                });
            } else {
                cb(null, {success:false, msg: '模块结构不正确'});
            }
        });
    },
    removeExtraControl: function(params, cb){
        var extraControlPath = webUtil.trim(params.value),
            apps = userCfg.get('apps'),
            use = userCfg.get('use');

        apps[use].extraControls = apps[use].extraControls || [];
        var newList = [];
        _.each(apps[use].extraControls, function(extraControl){
            if(extraControl != extraControlPath) {
                newList.push(extraControl);
            }
        });

        apps[use].extraControls = newList;

        userCfg.set('apps', apps);

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

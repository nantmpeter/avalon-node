/*
 * API ROUTES
 */
var webUtil = require('../../../lib/util/util'),
    path = require('path'),
    fs = require('fs'),
    _ = require('underscore'),
    userCfg = require('../../../lib/config/userConfig'),
    snapCfg = require('../../../lib/config/snapConfig'),
    request = require('request'),
    url = require('url'),
    Env = require('../../../lib/env');

//代理系列
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
        //check httpx
        var step = params.step || 0;
        if(step == 0) {
            cp.exec("tt -v", function (error, stdout, stderr) {
                if (error !== null) {
                    cb(null, {success: false, msg: '第一步：当前未找到httpx模块，请在命令行下手动安装httpx模块，安装命令为"npm install httpx -g"，mac用户请sudo，安装完成后再次点击升级。'});
                } else {
                    cb(null, {success: true,  step: 1});
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
                        cb(null, {success: true, step: 2});
                    }
                });
            } else {
                cb(null, {success: true, msg: 'httpx配置已经存在，Vmarket规则将不会覆盖当前httpx的配置', step: 2});
            }
        } else if(step ==2) {
            userCfg.set('proxyType', 'httpx');
            userCfg.save(function(err){
                if(err) {
                    cb(null, {success:false,msg:'Vmarket代理切换到httpx失败'});
                } else {
                    cb(null, {success:true, step: 3});
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
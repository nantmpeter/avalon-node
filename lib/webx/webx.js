﻿var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    colors = require('colors'),
    util = require('../util/util'),
    fileUtil = require('../util/fileUtil'),
    iconv = require('iconv-lite'),
    webxRouter = require('../finder/webxRouter'),
    commonFinder = require('../finder/common'),
    valueParser = require('velocity-parser').valueParser,
    _ = require('underscore');

/**
 * 查找module
 * @param p
 * @return {*}
 */
var findModule = function(p, config){
    var t = p.split('/'),
        subModules = config['subModule'];

    if(t.length <= 1) {
        if(config['defaultModule']) {
            return config['defaultModule'];
        }

        if(subModules['noModule']) {
            return 'noModule';
        }
        return null;
    }

    var baseModule = t.shift();
    if(baseModule.indexOf(':') != -1) {
        //trade:test.vm
        if(subModules[baseModule.split(':')[0]]) {
            return baseModule.split(':')[0];
        }
        return null;
    } else {
        //如果module在config里有，才算是真的submodule，否则都算path
        if(subModules[baseModule]) {
            return baseModule;
        }
        if(config['defaultModule']) {
            return config['defaultModule'];
        }
        //看看有没有默认module
        if(subModules['noModule']) {
            return 'noModule';
        }

        return null;
    }
};


var getNormalScreenPath = function(p, baseModule, config){
    //如果target没有module，则要把默认module追加上去
    if(baseModule != 'noModule' && p.indexOf(baseModule) == -1) {
        p = [baseModule, p].join('/');
    }
    /**
     * auction/order/buynow.vm => screen/order/buynow.vm
     * @type {*}
     */
    if(baseModule && config['subModule'][baseModule]) {
        var t = p.split('/');
        if(baseModule != 'noModule') {
            t.shift();
        }
        t.unshift('screen');

        return t.join('/');
    } else {
        return '';
    }
};

var getTemplatesInFileSync = function(p, baseModule, config, isControl){
    var content = {},
        sets = {};

    function getTemplates(p, innerModule, force) {
        p = p.replace(/^\//, '');
        var c = webxRouter.fileRoute(p, innerModule, config),
        //module不同的时候，key要加上module，仅对vm有效
            contentKey = force ? (innerModule + ':' + p) : (baseModule === innerModule || p.indexOf('.vm') == -1) ? p : (innerModule + ':' + p);

        if (!_.isNull(c)) {
            //一般变量都会放在set中，这样搜一把大部分问题都能解决
            util.mix(sets, util.getTemplateSetVars(c));
            content[contentKey] = c;
        } else {
            content[contentKey] = null;
        }

        var includes = commonFinder.includeTemplate(content[contentKey], _.keys(config.common));
        _.each(includes, function (include) {
            //这个include有可能是个变量
            if (!content[include]) {
                if (include.indexOf(':') != -1) {
                    var includeSplits = include.split(':');
                    getTemplates(includeSplits[1], includeSplits[0], true);
                } else if(/\$/.test(include)) {
                    include = valueParser.getVars(include)[0];
                    if(sets[include]) {
                        include = sets[include];
                        getTemplates(include, innerModule);
                    }
                } else {
                    getTemplates(include, innerModule);
                }
            }
        });
    }

    getTemplates(p, baseModule);

    if(!isControl) {
        var layout = webxRouter.getLayout(p, baseModule, config, content[p]);

        if(layout != "null") {
            if(layout.indexOf(':') != -1) {
                var layoutSplits = layout.split(':');
                getTemplates(layoutSplits[1], layoutSplits[0]);
            } else {
                getTemplates(layout, baseModule);
            }
        }
    }

    return content;
};

var getTemplatesJSONSync = function(p, baseModule, config){
    var includesCache = {},  //依赖cache
        contentCache = {},
        result = {};

    function getTemplatesTree(p, innerModule, tree){
        var includes,
            contentKey = baseModule === innerModule || p.indexOf('.vm') == -1 ? p : (innerModule + ':' + p);

        tree[contentKey] = {};

        if(includesCache[contentKey]) {
            includes = includesCache[contentKey];
        } else {
            var text;
            if(_.has(contentCache, contentKey)) {
                text = contentCache[contentKey];
            } else {
                text = webxRouter.fileRoute(p, innerModule, config);
                contentCache[contentKey] = text;
            }

            includes = commonFinder.includeTemplate(text, _.keys(config.common));
            includesCache[contentKey] = includes;
        }

        _.each(includes, function(include){
            if(include.indexOf(':') != -1) {
                var includeSplits = include.split(':');
                getTemplatesTree(includeSplits[1], includeSplits[0], tree[contentKey]);
            } else {
                getTemplatesTree(include, innerModule, tree[contentKey]);
            }
        });
    }

    getTemplatesTree(p, baseModule, result);

    var layout = webxRouter.getLayout(p, baseModule, config, contentCache[p]);

    if(layout != "null") {
        if(layout.indexOf(':') != -1) {
            var layoutSplits = layout.split(':');
            getTemplatesTree(layoutSplits[1], layoutSplits[0], result);
        } else {
            getTemplatesTree(layout, baseModule, result);
        }
    }

    return result;
};

var getScreenUrl = function(config, callback){
    var data = {};
    async.map(_.keys(config['subModule']), function(baseModule, cb){
        var screenRoot = config['subModule'][baseModule]['screen'];
        commonFinder.findScreenFile(screenRoot, function(err, result){
            var newResult = [], screenNameCache = {};
            //先循环一遍把screen整合一次
            _.each(result, function(v){
                var pathPrefix = v.replace(/\..*/, ''), screenCache;
                if(!screenNameCache[pathPrefix]) {
                    screenNameCache[pathPrefix] = [];
                }

                screenCache = screenNameCache[pathPrefix];

                screenCache.push(v);
            });

            //从cache中整理screen结构
            _.each(screenNameCache, function(v, k){
                var r = {};

                var vmPath = _.find(v, function(value){
                    return /\.vm/.test(value);
                });

                if(vmPath) {
                    //如果是包含vm的
                    r['detailPath'] = vmPath.replace(/\\/g, '/');
                    r['showPath'] = vmPath.replace(/\\/g, '/').replace('.vm', '.htm');
                    r['hrefPath'] = vmPath.replace(/\\/g, '/').replace('.vm', '.htm');
                    r['realPath'] = path.join(screenRoot, vmPath);
                    r['hasData'] = v.length > 1;
                } else {
                    //只有data的
                    vmPath = v[0];
                    r['detailPath'] = vmPath.replace(/\\/g, '/').replace(/\..*/, '.vm');
                    r['showPath'] = vmPath.replace(/\\/g, '/').replace(/\..*/, '.do');
                    r['hrefPath'] = vmPath.replace(/\\/g, '/').replace(/\..*/, '.do');
                    r['realPath'] = path.join(screenRoot, vmPath);
                    r['hasData'] = true;
                }

                newResult.push(r);
            });
            data[baseModule] = {
                screenRoot: screenRoot,
                detail: newResult
            };
            cb(err, newResult)
        });
    }, function(err, result){
        _.each(data, function(v, k){
            if(_.isEmpty(v)) {
                delete data[k];
            }
        });

        callback(err, data);
    });
};


/**
 * 获取json数据
 * @param text
 * @return {*}
 */
function getDataJSON(text, path){
    if(!text) return {};
    var cleanText = util.removeComments(text);

    //js貌似没法匹配单行注释
//    text = text.replace(/\/\*(\s|.)*?\*\//g, "");
    try {
        return JSON.parse(cleanText);
    } catch (ex) {
        console.log('[' + 'WARN'.yellow + '] %s to JSON >>> ' + 'Fail'.red.bold + ', use String instead', path.cyan);
        return text;
    }
}

module.exports = {
    /**
     * 获取一个新应用的所以配置
     * @param root
     * @param cb
     */
    getConfig: function(root, type, cb){
        root = path.resolve(root);
        if(!fs.existsSync(root)) {
            cb('您当前填写的目录不存在，请确认后重试');
            return;
        }
        var stat = fs.statSync(root);
        if(stat.isFile()) {
            root = path.dirname(root);
        }

        var appName = path.basename(root);
        var config = {};

        var app = {
            root:root
        };

        webxRouter.finderRoute(app, type, function(err, appCfg){
            config[appName] = appCfg;
            //这里回调应用配置
            cb(err, appCfg);
        });
    },
    getContentSync: function(p, baseModule, config){
        //e.g. order/buynow.vm
        if(baseModule && config['subModule'][baseModule]) {
            return getTemplatesInFileSync(p, baseModule, config);
        } else {
            return {};
        }
    },
    getExtraControlSync: function(extraControlList, contentList, baseModule, config){
        var result = {};

        _.each(extraControlList, function(p) {
            if(!result[p]) {
                if(p.indexOf(':') != -1) {
                    var innerModule = p.split(':')[0],
                        innerPath = p.split(':')[1];
                    if(innerModule && config['subModule'][innerModule]) {
                        //noModule:control/json.vm => control/json.vm
                        var tempContent = getTemplatesInFileSync(innerPath, innerModule, config, true);
                        if(innerModule != baseModule) {
                            //这里还是有bug的，如果vm不包含其他的control的话是可以这样的
                            result = util.merge(result, tempContent);
                            result[p] = tempContent[innerPath];
                        } else {
                            result = util.merge(result, tempContent);
                        }
                    }
                } else {
                    if(baseModule && config['subModule'][baseModule]) {
                        result = util.merge(result, getTemplatesInFileSync(p, baseModule, config, true));
                    }
                }
            }
        });

        return result;
    },
    /**
     * 获取json数据
     *
     * @param currentModule
     * @param contentKeys
     * @param config
     * @param defaultValue 文件不存在的默认数据
     * @return {{}}
     */
    getDataSync: function(currentModule, contentKeys, config, defaultValue) {
        if(_.isUndefined(defaultValue)) {
            defaultValue = {};
        }

        var basePath = config['webRoot'],
            data = {};
        if(config["data"]) {
            basePath = config["data"];
        }

        //e.g. /auction/order/buynow.vm
        if(currentModule && config['subModule'][currentModule]) {
            _.each(contentKeys, function(vm){
                var module = currentModule, t;

                if(/:/.test(vm)) {
                    module = vm.split(':')[0];
                    t = vm.split(':')[1].split('/');
                } else {
                    t = vm.split('/');
                }

                if(config['subModule'][module]) {
                    var type = t.shift(),
                        pathPrefix = type == 'vmcommon' ? config.common[type]: config['subModule'][module][type];

                    if(pathPrefix) {
                        var dataPath = path.join(pathPrefix, t.join(path.sep).replace('.vm', '.json'));
                        //get data
                        if(fs.existsSync(dataPath)) {
                            var json = fileUtil.getFileContentSync(dataPath, config['encoding'] || 'gbk', '');
                            data[vm] = getDataJSON(json, dataPath);
                        } else {
                            data[vm] = defaultValue;
                        }
                    }
                } else {
                    console.log('[' + 'WARN'.yellow + '] module ' + module.cyan + ' was not found');
                }
            });
        }

        return data;
    },
    getDataTextSync: function(currentModule, contentKeys, config, defaultValue) {
        if(_.isUndefined(defaultValue)) {
            defaultValue = {};
        }

        var basePath = config['webRoot'],
            data = {};
        if(config["data"]) {
            basePath = config["data"];
        }

        //e.g. /auction/order/buynow.vm
        if(currentModule && config['subModule'][currentModule]) {
            _.each(contentKeys, function(vm){
                var module = currentModule, t;

                if(/:/.test(vm)) {
                    module = vm.split(':')[0];
                    t = vm.split(':')[1].split('/');
                } else {
                    t = vm.split('/');
                }

                if(config['subModule'][currentModule]) {
                    var type = t.shift(),
                        pathPrefix = type == 'vmcommon' ? config.common[type]: config['subModule'][currentModule][type];

                    if(pathPrefix) {
                        var dataPath = path.join(pathPrefix, t.join(path.sep).replace('.vm', '.json'));
                        //get data
                        if(fs.existsSync(dataPath)) {
                            var json = fileUtil.getFileContentSync(dataPath, config['encoding'] || 'gbk', '');
                            data[vm] = {
                                text: json,
                                real: dataPath
                            };
                        } else {
                            data[vm] = {
                                text: defaultValue,
                                real: dataPath
                            };
                        }
                    }
                } else {
                    console.log('[' + 'WARN'.yellow + '] module ' + module.cyan + ' was not found');
                }
            });
        }

        return data;
    },
    getCustomDataSync:function(currentModule, contentKeys, config, defaultValue, appendRealPath){
        var basePath = config['webRoot'],
            data = {};
        if(config["data"]) {
            basePath = config["data"];
        }

        //e.g. /auction/order/buynow.vm
        if(currentModule && config['subModule'][currentModule]) {
            _.each(contentKeys, function(vm){
                var module = currentModule, t;

                if(/:/.test(vm)) {
                    module = vm.split(':')[0];
                    t = vm.split(':')[1].split('/');
                } else {
                    t = vm.split('/');
                }

                if(config['subModule'][module]) {
                    var type = t.shift(),
                        pathPrefix = type == 'vmcommon' ? config.common[type]: config['subModule'][module][type];

                    if(pathPrefix) {
                        var dataPath = path.join(pathPrefix, t.join(path.sep).replace('.vm', '.js'));
                        //get data
                        if(fs.existsSync(dataPath)) {
                            if(appendRealPath) {
                                data[vm] = {
                                    text: fileUtil.getFileContentSync(dataPath, config['encoding'] || 'gbk', ''),
                                    real: dataPath
                                };
                            } else {
                                data[vm] = fileUtil.getFileContentSync(dataPath, config['encoding'] || 'gbk', '');
                            }
                        } else {
                            if(appendRealPath) {
                                if(!_.isUndefined(defaultValue)) {
                                    data[vm] = {
                                        text: defaultValue,
                                        real: dataPath
                                    };
                                }
                            } else {
                                data[vm] = defaultValue;
                            }
                        }
                    }
                } else {
                    console.log('[' + 'WARN'.yellow + '] module ' + module.cyan + ' was not found');
                }
            });
        }

        return data;
    },
    getMacroSync: function(config) {
        var content = [];
        if(config['webRoot'] && config['macros']) {
            var macroPath = config['macros'];
            _.each(macroPath, function(macro){
                content.push(fileUtil.getFileContentSync(path.join(config['webRoot'], macro), config['encoding'] || 'gbk'), '');
            });

            return content.join('\r\n');
        }
        return '';
    },
    findModule: findModule,
    getNormalScreenPath: getNormalScreenPath,
    getScreenUrl: getScreenUrl,
    getIncludeVm: function(p, m, config){
        //e.g. order/buynow.vm
        if(m && config['subModule'][m]) {
            return getTemplatesJSONSync(p, m, config);
        } else {
            var result = {};
            result[p] = '';
            return result;
        }
    },
    getLayouts: function(target, baseModule, config, callback){
        if(baseModule && config['subModule']) {
            var modules = {};

            _.each(config['subModule'], function(moduleConfig, moduleName){
                modules[moduleName] = moduleConfig['layout'];
            });
            commonFinder.findLayoutFile(modules, callback);
        }
    },
    getControlFormat: function(controlPath, modules, commonModules, callback){
        var searchBasePath,
            searchModule,
            searchFullPath,
            formatControlPart,
            hasModule = controlPath.split(':').length > 1;

        if(hasModule) {
            searchModule = controlPath.split(':')[0];
            formatControlPart = controlPath.split(':')[1];
        } else {
            formatControlPart = controlPath;
        }

        //先补充完整路径
        if(!/^\/?control/.test(formatControlPart)) {
            formatControlPart = formatControlPart.replace(/^\//, '');
            formatControlPart = 'control/' + formatControlPart
        }

        formatControlPart = formatControlPart.replace(/\\/g, '/');
        formatControlPart = formatControlPart.replace(/^\//, '');
        var bakPath = formatControlPart;
        formatControlPart = formatControlPart.replace(/^control\//, '');


        if(commonModules && _.indexOf(_.keys(commonModules), formatControlPart.split('/')[0]) == -1) {
            var hasFind = false, findModule, findPath;
            _.each(modules, function(moduleConfig, moduleName) {
                if(!hasFind && !hasModule || (hasModule && moduleName == searchModule)) {
                    searchBasePath = moduleConfig['control'];

                    if(fs.existsSync(searchBasePath)) {
                        searchFullPath = path.join(searchBasePath, formatControlPart);

                        if(fs.existsSync(searchFullPath)) {
                            hasFind = true;
                            findModule = moduleName;
                            findPath = bakPath;
                        }
                    }
                }
            });
            if(hasFind) {
                callback(findModule + ':' + findPath);
                return;
            }
        } else {
            var bakPath = formatControlPart;
            searchBasePath = commonModules[formatControlPart.split('/')[0]];
            formatControlPart = formatControlPart.split('/');
            formatControlPart.shift();
            formatControlPart = formatControlPart.join('/');

            searchFullPath = path.join(searchBasePath, formatControlPart);
            if(fs.existsSync(searchFullPath)) {
                callback(bakPath);
                return;
            }
        }

        callback();

    }
};
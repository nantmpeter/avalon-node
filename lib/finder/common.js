/**
 * @fileoverview
 * @author 张挺 <zhangting@taobao.com>
 *
 */

var fs = require('fs'),
    path = require('path'),
    colors = require('colors'),
    fileUtil = require('../util/fileUtil'),
    async = require('async'),
    util = require('../util/util'),
    _ = require('underscore');

/**
 * 查找文件内容中的模板
 * @param content
 * @param commons {Array}
 */
var includeTemplate = function(content, commons){
    var includes = [];

    commons = commons || [];

    content = util.removeVelocityComments(content);
    var result = content.match(/(#parse|#include|\$.*\.setTemplate).*?('|")\)/g);
    _.each(result, function(v) {
        var parseType = v.indexOf('#parse') != -1,
            includeType = v.indexOf('#include') != -1;
        if(parseType) {
            v = v.replace(/#parse\(('|")\s*/, '');
        } else if(includeType) {
            v = v.replace(/#include\(('|")\s*/, '');
        } else {
            //control && vmcommonControl
            v = v.replace(/\$.*\.setTemplate\(('|")\s*/, '');
        }
        v = v.replace(/('|")\s*\)/, '');
        if(v.indexOf('/') == 0) {
            v = v.substring(1);
        }

        if(parseType || includeType) {
            includes.push(v);
        } else {
            if(_.some(commons, function(el){return v.indexOf(el) != -1})) {
                includes.push(v);
            } else if(v.indexOf(":") != -1) {
                //有可能有$control.setTemplate('trade:test.vm') ->trade:control/test.vm
                var vs = v.split(':');
                includes.push([vs[0], ':control/' + vs[1]].join(''));
            } else {
                includes.push('control/' + v);
            }
        }
    });

    return includes;
};

module.exports = {
    findScreenFile: function(screenRoot, cb){
        if(!fs.existsSync(screenRoot)) {
            cb(null, []);
            return;
        }
        fileUtil.findInDir(screenRoot, function(fileName) {
            if((/\.vm$/.test(fileName)
                || /\.js$/.test(fileName)
                || /\.json$/.test(fileName))
                && !/\.svn/.test(fileName)) {
                return true;
            }
            return false;
        }, function(err, result) {
            cb(err, result);
        });
    },
    findLayoutFile: function(modules, cb){
        var layouts = {};
        async.map(_.keys(modules),function(module, callback){
            var layoutRoot = modules[module];

            if(!fs.existsSync(layoutRoot)) {
                layouts[module] = [];
                callback(null, module);
            } else {
                fileUtil.findInDir(layoutRoot, function(fileName) {
                    if((/\.vm/.test(fileName)
                        || /\.js/.test(fileName)
                        || /\.json/.test(fileName))
                        && !/\.svn/.test(fileName)) {
                        return true;
                    }
                    return false;
                }, function(err, result) {
                    layouts[module] = result || [];
                    //这里err有可能不为空呢，比如path不存在
                    callback(null, result);
                });
            }

        }, function(err, result){
            cb(err, layouts);
        });

    },
    includeTemplate: includeTemplate
};
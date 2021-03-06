﻿/**
 * @fileoverview
 * @author Harry <czy88840616@gmail.com>
 *
 */
var request = require('request'),
    webx = require('./webx'),
    vm = require('vm'),
    iconv = require('iconv-lite'),
    _ = require('underscore'),
    webUtil = require('../util/util'),
    requestBuilder = require('../util/requestBuilder');

function Template(cfg){
    var that = this;

    if(cfg.target.indexOf('/') == 0) {
        cfg.target = cfg.target.substring(1);
    }
    // 构建json
    this.config = cfg.config;

    this.module = webx.findModule(cfg.target, this.config);

    this.target = webx.getNormalScreenPath(cfg.target, this.module, this.config);

    //模板内容
    this.content = webx.getContentSync(this.target, this.module, this.config);

    //说明没有模板
    this.macro = webx.getMacroSync(this.config);

    this.extraContents = webx.getExtraControlSync(this.config['extraControls']||[], this.content, this.module, this.config);

    this.content = webUtil.merge(this.content, this.extraContents);
    //data
    this.data = webx.getDataSync(this.module, _.keys(this.content), this.config, {});

    this.render = function(req, res){
        var self = this;

        var customData = webx.getCustomDataSync(this.module, _.keys(this.content), this.config);
        if(!_.isEmpty(customData)) {
            //如果是*.do的请求
            if(_.isNull(this.content[this.target])) {
                //如果静态数据不是json对象而是字符串的话
                var tmpString;

                if(_.isString(this.data[this.target])) {
                    tmpString = {text: this.data[this.target]||''};
                } else {
                    tmpString = {text: JSON.stringify(this.data[this.target])};
                }

                try {
                    vm.runInNewContext(customData[this.target], {
                        request:req,
                        response: res,
                        data:  tmpString,
                        console: console,
                        require: require,
                        appConfig: this.config
                    });

                    this.data[this.target] = '' + tmpString['text'] || '';
                } catch (ex) {
                    res.send('["' + this.target.replace('.vm', '.js') + '"]:\t' + ex);
                    return;
                }
            } else {
                //普通请求的自定义数据

                //渲染control的动态数据
                _.each(customData, function(customText, vmName){
                    if(vmName != self.target) {
                        try {
                            //control的动态数据不会有req和res
                            vm.runInNewContext(customData[vmName], {
                                data: self.data[vmName] || {},
                                console: console,
                                require: require,
                                appConfig: self.config
                            });
                        } catch (ex) {
                            console.log('["' + vmName.replace('.vm', '.js') + '"]:\t' + ex);
                        }
                    }
                });

                //渲染target的customdata
                try {
                    vm.runInNewContext(customData[this.target], {
                        request:req,
                        response: res,
                        data: this.data[this.target] || {},
                        console: console,
                        require: require,
                        appConfig: this.config
                    });

                    if(this.data[this.target].GLOBAL && this.data[this.target].GLOBAL.stop) {
                        return;
                    }
                } catch (ex) {
                    res.send('["' + this.target.replace('.vm', '.js') + '"]:\t' + ex);
                    return;
                }
            }
        }

        //无模板情况下直接输出json数据
        if(_.isEmpty(this.content)
            || !_.has(this.content, this.target)
            || _.isNull(this.content[this.target]) ) {

            if(this.data[this.target]) {
                res.send(this.data[this.target]);
            } else {
                res.render('404', {
                    app: cfg.app
                });
            }
            return;
        }

        request.post(cfg.api, {
            encoding:'utf-8',
            qs:{
                app: cfg.app
            },
            form:{
                target: this.target,
                templates:JSON.stringify(this.content),
                data:JSON.stringify(this.data),
                macros:this.macro,
                tools:JSON.stringify(this.config.tools||{}),
                parameters:JSON.stringify(cfg.parameters),
                type:this.config.type || 'taobao',
                isControlGlobal: this.config.isControlGlobal,
                requestInfo: requestBuilder.build(req)
            },
            headers: {
                "User-Agent":"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/99999 Safari/537.11"
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var data;
                try {
                    data = JSON.parse(body);
                } catch(ex) {
                    data = {result:false,error:ex};
                }

                if(data.result) {
                    var encoding = that.config['encoding'] || 'gbk';
                    if(encoding == 'gbk') {
                        res.setHeader('Content-Type','text/html;charset=GBK');
                        res.send(iconv.encode(data.content, 'gbk'));
                    } else {
                        res.send(data.content);
                    }
                } else {
                    res.render('error', {
                        errors:data.errors,
                        content:data.content,
                        stack:{
                            '渲染模板': '<pre>' + that.target + '</pre>',
                            '包含模板':'<pre>' + JSON.stringify(_.keys(that.content), null, 4) + '</pre>',
                            '数据':'<pre>' + JSON.stringify(that.data, null, 4) + '</pre>'
//                            '宏':'<pre>' + JSON.stringify(that.macro, null, 4) + '</pre>'
//                            '工具类':{}
                        },
                        body:body
                    });
                }
            } else {
                if(error) {
                    res.send(error);
                } else {
                    res.send(response.statusCode);
                }
            }
        });
    };

    this.renderText = function(callback){
        var self = this;
        var customData = webx.getCustomDataSync(this.module, _.keys(this.content), this.config);
        var mockReq = {};
            mockReq['query'] = cfg.parameters;

        if(!_.isEmpty(customData)) {
            //渲染control的动态数据
            _.each(customData, function(customText, vmName){
                if(vmName != self.target) {
                    try {
                        //control的动态数据不会有req和res
                        vm.runInNewContext(customData[vmName], {
                            data: self.data[vmName] || {},
                            console: console,
                            require: require,
                            appConfig: self.config
                        });
                    } catch (ex) {
                        console.log('["' + vmName.replace('.vm', '.js') + '"]:\t' + ex);
                    }
                }
            });

            //渲染target的customdata
            try {
                vm.runInNewContext(customData[this.target], {
                    request:mockReq,
                    data: this.data[this.target] || {},
                    console: console,
                    require: require,
                    appConfig: this.config
                });
            } catch (ex) {
                callback('["' + this.target.replace('.vm', '.js') + '"]:\t' + ex);
                return;
            }
        }

        //无模板情况下直接输出json数据
        if(_.isEmpty(this.content)
            || !_.has(this.content, this.target)
            || _.isNull(this.content[this.target]) ) {

            if(this.data[this.target]) {
                callback(this.data[this.target]);
            } else {
                callback('404');
            }
            return;
        }

        request.post(cfg.api, {
            encoding:'utf-8',
            qs:{
                app: cfg.app
            },
            form:{
                target: this.target,
                templates:JSON.stringify(this.content),
                data:JSON.stringify(this.data),
                macros:this.macro,
                tools:JSON.stringify(this.config.tools||{}),
                parameters:JSON.stringify(cfg.parameters),
                type:this.config.type || 'taobao',
                isControlGlobal: this.config.isControlGlobal
            },
            headers: {
                "User-Agent":"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/99999 Safari/537.11"
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var data;
                try {
                    data = JSON.parse(body);
                } catch(ex) {
                    data = {result:false,error:ex};
                }

                if(data.result) {
                    //这里都以utf8编码保存先
                    callback(data.content);
                } else {
                    callback(body);
                }
            } else {
                if(error) {
                    callback(error);
                } else {
                    callback(response.statusCode);
                }
            }
        });
    }
}

module.exports = Template;
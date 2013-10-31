/**
 * @fileoverview
 * @author 张挺 <zhangting@taobao.com>
 *
 */
var assert = require("assert"),
    fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    exec = require("child_process").exec;

describe('test exec php', function() {
    it('test exec', function(done) {
        exec("dir", {
            cwd: 'D:\\Dropbox\\UED\\uedproject\\project\\buy_platform_frontend_20110212\\buy\\assets\\4.0\\tc\\test'
        }, function (error, stdout, stderr) {
            if(error) {
                console.log(stderr);
            } else {
                console.log(stdout);
            }
            done();
        });
    });

    it('test php', function(done) {
        exec("D:\\Dropbox\\UED\\nginx\\php\\php.exe test.php", {
            cwd: 'D:\\Dropbox\\UED\\uedproject\\project\\buy_platform_frontend_20110212\\buy\\assets\\4.0\\tc\\test'
        }, function (error, stdout, stderr) {
            if(error) {
                console.log(stderr);
            } else {
                console.log(stdout);
            }
            done();
        });
    });
});
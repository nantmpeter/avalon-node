/**
 * @fileoverview
 * @author Harry <czy88840616@gmail.com>
 *
 */
var util = require('../util/util'),
    commonFinder = require('../finder/common'),
    fs = require('fs'),
    async = require('async'),
    _ = require('underscore');

var getFileList = function(config, callback){
    commonFinder.findFlieList(config.root, function(fileName) {
        return (/\.php$/.test(fileName)
            || /\.php5$/.test(fileName)
            && !/\.svn/.test(fileName));
    }, function(err, result){
        var newResult = [];

        _.each(result, function(url) {
            newResult.push({
                realPath: url,
                hrefPath: url.replace(/\\\\/, '/')
            });
        });

        callback(err, newResult)
    });
};

module.exports = {
    getFileList: getFileList
};
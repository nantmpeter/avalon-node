var url = require('url'),
    _ = require('underscore');

/**
 * 格式化webx类型的url，把下划线变为驼峰形式，且后缀变成vm
 * @param p
 * @returns {string}
 */
var formatUrl = function(p, suffix){
    var t = url.parse(p).path.split('/'),
        oldNames = t.pop().replace(/\..*$/, '').split('_'),
        newNames = [];

    _.each(oldNames, function(v, idx) {
        if(idx != 0) {
            newNames.push(v.substring(0, 1).toUpperCase() + v.substring(1));
        } else {
            newNames.push(v);
        }
    });

    t.push(newNames.join(''));

    if(suffix) {
        return t.join('/') + suffix;
    } else {
        return t.join('/') + '.vm';
    }
};

module.exports = {
    formatUrl: formatUrl
};
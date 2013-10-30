/**
 * @fileoverview
 * @author Harry <czy88840616@gmail.com>
 *
 */

var Template = require('../webx/template'),
    info = require('../webx/info'),
    _ = require('underscore'),
    webUtil = require('../util/util'),
    userCfg = require('../config/userConfig'),
    exec = require("child_process").exec;

module.exports = {
    render: function(req, res){
        exec("php " + req.url, function (error, stdout, stderr) {
            if(error) {
                res.send(error);
            } else {
                res.send(stdout);
            }
        });
    }
};
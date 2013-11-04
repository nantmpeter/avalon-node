/**
 * @fileoverview
 * @author Harry <czy88840616@gmail.com>
 *
 */
var fs = require('fs'),
    userCfg = require('../config/userConfig'),
    cp = require('child_process'),
    phpProcess;

var refreshPhpEnv = function(){
    if(phpProcess) {
        phpProcess.kill();
        phpProcess = null;
    }

    var apps = userCfg.get('apps'),
        use = userCfg.get('use'),
        env = userCfg.get('env');

    if(env['php'] && apps[use].type == 'php' && fs.existsSync(apps[use].root)) {
        phpProcess = cp.spawn("php", [
            '-S', 'localhost:8803',
            '-t',  apps[use].root
        ], {
            cwd: env['php']
        });
    }
};

module.exports = {
    refreshPhpEnv: refreshPhpEnv,
    checkEnv: function(){
        if(!phpProcess) {
            refreshPhpEnv();
        }
    }
};
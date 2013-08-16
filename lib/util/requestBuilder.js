module.exports = {
    build: function(req){
        return JSON.stringify({
            host: req.host,
            url: req.url,
            path: req.path
        });
    }
};
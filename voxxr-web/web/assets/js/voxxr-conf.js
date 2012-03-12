(function(exports) {
    exports.models = exports.models || {};
//    exports.models.baseUrl = "http://localhost:8080/r";
//    exports.models.baseUrl = "http://3.latest.voxxr-web.appspot.com/r";
    exports.models.baseUrl = "http://app.voxxr.in/r";
    if (urlParams['mode'] === 'dev') {
        exports.models.baseUrl = "http://localhost:8080/r";
    }
})(window)

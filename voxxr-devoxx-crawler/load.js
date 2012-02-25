var request = require('request'),
    Q = require('q');

module.exports = function(options) {
    var deferred = Q.defer();
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try {
            var json = JSON.parse(body);
            deferred.resolve(json);
            } catch (e) {
                console.log('error when parsing response from ', options, body);
                throw e;
            }
        } else {
            deferred.reject(error);
        }
    });
    return deferred.promise
}
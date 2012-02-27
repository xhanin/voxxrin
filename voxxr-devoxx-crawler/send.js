var request = require('request'),
    Q = require('q');

module.exports = function(options, data) {
    if ('string' == typeof options) options = { url: options }
    options.method = options.method || 'POST';
    options.headers = options.headers || {
        'Authorization':'Qh12EEHzVPn2AkKfihVs',
        'Content-Type': 'application/json'
    }
    options.body = JSON.stringify(data);

    var deferred = Q.defer();
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            deferred.resolve(body);
        } else {
            deferred.reject({f:'send', error: error, response: response, options: options});
        }
    });
    return deferred.promise
}
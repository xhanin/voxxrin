var request = require('request'),
    Q = require('q');

module.exports = function(url) {
    var deferred = Q.defer();
    request({ uri: url, headers: {
        "User-Agent": "Node"
    } }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try {
            var json = JSON.parse(body);
            deferred.resolve(json);
            } catch (e) {
                console.log('error when parsing response from ', url, body);
                throw e;
            }
        } else if(response !== undefined && response.statusCode != 200) {
            console.log("errors received when requesting "+url+" : "+response.statusCode);
            deferred.reject('404: ' + url);
        } else {
            deferred.reject({f:'load', error: error, response: response, options: url});
        }
    });
    return deferred.promise
}
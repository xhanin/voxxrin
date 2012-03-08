
///////////// ROUTING
var PATH_REPLACER = "([^\/]+)",
        PATH_NAME_MATCHER = /:([\w\d]+)/g;
function Route(path, callback, history) {
    var param_names = [];
    // find the names
    while ((path_match = PATH_NAME_MATCHER.exec(path)) !== null) {
      param_names.push(path_match[1]);
    }

    function parse(hash) {
        if (hash.match(regexp)) {
            var params = {};
            var path_params = regexp.exec(hash);
            path_params.shift();
            $.each(path_params, function(i, param) {
                params[param_names[i]] = param;
            });
            return {params: params};
        } else {
            return null;
        }
    }
    function merge(h, p) {
        var merged = h;
        _(p.params).each(function(v,k) {
            merged = merged.replace(':' + k, v);
        })
        return merged;
    }

    this.history = history;

    this.pushHistory = function(jQT, hash) {
        var p = parse(hash);
        _(this.history).each(function(h) {
            jQT.goTo(merge(h, p));
        });
    }
    // replace with the path replacement
    var regexp = new RegExp(path.replace(PATH_NAME_MATCHER, PATH_REPLACER) + "$");
    this.match = function(hash) {
        return hash.match(regexp);
    }
    this.apply = function(hash) {
        console.log('routed to ' + hash)
        callback.apply(parse(hash));
    }
}
Route.routes = [];
Route.add = function(path, callback, history) {
    Route.routes.push(new Route(path, callback, history));
    return Route;
}
Route.hashChangeHandler = function() {
    var route = _(Route.routes).find(function(r) {return r.match(location.hash)});
    if (route) {route.apply(location.hash)}
}
Route.start = function() {
    // we define jQT object because we rely on its API to push back history pages
    // could easily be refactored out of there with an API to push back history pages
    window.jQT = new $.jQTouch({
        statusBar: 'black',
        onInitHistoryFromHash: function(jQT, hash) {
            var route = _(Route.routes).find(function(r) {return r.match(hash)});
            if (route) {
                route.pushHistory(jQT, hash);
                jQT.goTo(hash);
            }
        }
    });

}
$(window).bind('hashchange', Route.hashChangeHandler);
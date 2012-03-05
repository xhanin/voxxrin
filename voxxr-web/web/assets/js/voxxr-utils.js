if (_) {
    _.mixin({
      capitalize : function(string) {
        return string.charAt(0).toUpperCase() + string.substring(1);
      }
    });
}

if (ko) {
    ko.bindingHandlers.tap = {
            'init': function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var newValueAccessor = function () {
                    var result = {};
                    result.tap = valueAccessor();
                    return result;
                };
                return ko.bindingHandlers['event']['init'].call(this, element, newValueAccessor, allBindingsAccessor, viewModel);
            }
    };
    ko.bindingHandlers.href = {
        update: function(element, valueAccessor, allBindingsAccessor) {
            var value = valueAccessor();
            var valueUnwrapped = ko.utils.unwrapObservable(value);
            $(element).attr('href', valueUnwrapped);
        }
    };
}

var urlParams = {};
(function () {
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&=]+)=?([^&]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = window.location.search.substring(1);

    while (e = r.exec(q))
       urlParams[d(e[1])] = d(e[2]);
})();


function whenDeviceReady(callback) {
    if (typeof navigator.device == "undefined"){
         document.addEventListener("deviceready", callback, false);
    } else {
        callback.call(document);
    }
}

///////////// ROUTING
var PATH_REPLACER = "([^\/]+)",
        PATH_NAME_MATCHER = /:([\w\d]+)/g;
function Route(path, callback) {
    var param_names = [];
    // find the names
    while ((path_match = PATH_NAME_MATCHER.exec(path)) !== null) {
      param_names.push(path_match[1]);
    }
    // replace with the path replacement
    var regexp = new RegExp(path.replace(PATH_NAME_MATCHER, PATH_REPLACER) + "$");
    this.apply = function(hash) {
        if (hash.match(regexp)) {
            console.log('routed to ' + path);
            var params = {};
            var path_params = regexp.exec(hash);
            path_params.shift();
            $.each(path_params, function(i, param) {
                params[param_names[i]] = param;
            });

            callback.apply({params: params});
            return true;
        }
        return false;
    }
}
Route.routes = [];
Route.add = function(path, callback) {
    Route.routes.push(new Route(path, callback));
    return Route;
}
Route.hashChangeHandler = function() {
    _(Route.routes).find(function(r) {return r.apply(location.hash)});
}
Route.start = Route.hashChangeHandler;
$(window).bind('hashchange', Route.hashChangeHandler);
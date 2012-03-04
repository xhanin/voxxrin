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

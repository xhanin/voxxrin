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


function getJSON(uri, onSuccess) {
    var json = localStorage.getItem(uri);
    if (json) {
        onSuccess(JSON.parse(json));
    }
    whenDeviceReady(function() {
        if (!models.Device.current().offline()) {
            // refresh
            $.ajax({
                url: models.baseUrl + uri,
                dataType:"text",
                type: "GET",
                success: function(json) {
                    localStorage.setItem(uri, json);
                    onSuccess(JSON.parse(json));
                },
                error: function() {
                    console.log('error occured while loading ', uri);
                }
            });
        }
    });
}

function jqmClean(selector) {
    $(selector).find('a').removeClass('ui-btn-text').data('button', null);
    $(selector).find('ul').data('listview', null);
    $(selector).find('ul li, ul li div').removeClass('ul-li ui-btn ui-li-static');
}

function jqmCleanOrRefreshOn(observable, selector) {
    observable.subscribe(function(newValue) {
       if (!newValue) {
           jqmClean(selector);
       } else {
           setTimeout(function() {
               console.log('refreshing ' + selector);
               jqmClean(selector);
                $(selector).refreshPage();
                $(selector).trigger('create');
           }, 0);
       }
    });
}
function jqmRefreshOn(observable, selector) {
    observable.subscribe(function() {
       setTimeout(function() {
           console.log('refreshing ' + selector);
           jqmClean(selector);
            $(selector).refreshPage();
            $(selector).trigger('create');
       }, 0);
    });
}
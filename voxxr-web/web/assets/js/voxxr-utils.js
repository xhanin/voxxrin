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
    ko.bindingHandlers.btntext = {
        update: function(element, valueAccessor, allBindingsAccessor) {
            var value = valueAccessor();
            var valueUnwrapped = ko.utils.unwrapObservable(value);
            $(element).find('.ui-btn-text').text(valueUnwrapped);
        }
    };

ko.bindingHandlers['listview'] = {
    makeTemplateValueAccessor: function(valueAccessor) {
        return function() {
            var bindingValue = ko.utils.unwrapObservable(valueAccessor());

            // If bindingValue is the array, just pass it on its own
            if ((!bindingValue) || typeof bindingValue.length == "number")
                return {
                    'foreach': bindingValue,
                    'afterRender': function(nodes) {
                        if (nodes.length) {
                            var parent = $(nodes[0]).parent();
                            if (parent.data('listview')) {
                                parent.listview('refresh');
                            }
                        }
                    },
                    'templateEngine': ko.nativeTemplateEngine.instance };

            // If bindingValue.data is the array, preserve all relevant options
            return {
                'foreach': bindingValue['data'],
                'includeDestroyed': bindingValue['includeDestroyed'],
                'afterAdd': bindingValue['afterAdd'],
                'beforeRemove': bindingValue['beforeRemove'],
                'afterRender': bindingValue['afterRender'],
                'templateEngine': ko.nativeTemplateEngine.instance
            };
        };
    },
    'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['listview'].makeTemplateValueAccessor(valueAccessor));
    },
    'update': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['listview'].makeTemplateValueAccessor(valueAccessor), allBindingsAccessor, viewModel, bindingContext);
    }
};
ko.jsonExpressionRewriting.bindingRewriteValidators['listview'] = false; // Can't rewrite control flow bindings

ko.bindingHandlers['jqmforeach'] = {
    makeTemplateValueAccessor: function(valueAccessor) {
        return function() {
            var bindingValue = ko.utils.unwrapObservable(valueAccessor());

            // If bindingValue is the array, just pass it on its own
            if ((!bindingValue) || typeof bindingValue.length == "number")
                return {
                    'foreach': bindingValue,
                    'afterRender': function(nodes) {
                        if (nodes.length) {
                            var parent = $(nodes[0]).parent();
                            $.mobile.collapsible.prototype.enhanceWithin( parent );
                            $.mobile.listview.prototype.enhanceWithin( parent );
                        }
                    },
                    'templateEngine': ko.nativeTemplateEngine.instance };

            // If bindingValue.data is the array, preserve all relevant options
            return {
                'foreach': bindingValue['data'],
                'includeDestroyed': bindingValue['includeDestroyed'],
                'afterAdd': bindingValue['afterAdd'],
                'beforeRemove': bindingValue['beforeRemove'],
                'afterRender': bindingValue['afterRender'],
                'templateEngine': ko.nativeTemplateEngine.instance
            };
        };
    },
    'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['jqmforeach'].makeTemplateValueAccessor(valueAccessor));
    },
    'update': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['jqmforeach'].makeTemplateValueAccessor(valueAccessor), allBindingsAccessor, viewModel, bindingContext);
    }
};
ko.jsonExpressionRewriting.bindingRewriteValidators['jqmforeach'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['jqmforeach'] = true;

ko.bindingHandlers['blockn'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor() || {});
        var count = ko.utils.unwrapObservable(value);
        for (var i=1; i<=12; i++) {
            ko.utils.toggleDomNodeCssClass(element, 'ui-block-' + i, false);
        }
        ko.utils.toggleDomNodeCssClass(element, 'ui-block-' + count, true);
    }
};

}

(function( $ ){
    $.fn.highlight = function(count) {
        var self = this;
        count = count || 5;
        var hide = function() {
            if (count > 0) {
                self.fadeTo('fast', 0.1, show);
            }
        };
        var show = function() {
            count--;
            self.fadeTo('slow', 1, hide);
        };
        hide();
    };
})( jQuery );

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

function postJSON(uri, data, onSuccess) {
    var dfd = new $.Deferred();
    models.Device.current().whenReady(function() {
        if (!models.Device.current().offline()) {
            $.ajax({
                url: uri,
                data: JSON.stringify(data),
                contentType:"json",
                dataType:"json",
                type: "POST",
                beforeSend: function(xhr) {
                    // BASIC authentication
                    var username = models.User.current().name();
                    var password = ''; // no password to authenticate ATM
                    xhr.setRequestHeader("Authorization", username);
                },
                success: function(json) {
                    if (onSuccess) {
                        onSuccess(json);
                    }
                    dfd.resolve(json);
                },
                error: function() {
                    console.log('error occured while posting ', uri);
                    dfd.reject();
                }
            });
        } else {
            dfd.reject('offline');
        }
    });
    return dfd.promise();
}

function getJSON(uri, onSuccess, options) {
    options = _.defaults({}, options, {uselocal: true, usenetwork: true, authenticate: true});
    var dfd = new $.Deferred();

    setTimeout(function(){
        var obj = null;
        var localTimeout = null;
        var networkDone = false;
        var localDone = false;
        if (options.uselocal === true
            || (options.uselocal === 'whenoffline' && models.Device.current().offline())) {
            var json = localStorage.getItem(uri);
            if (json) {
                console.log('parsing local data for ' + uri);
                obj = JSON.parse(json);
                // call success callback in a few ms to call it asynchronously in any case
                localTimeout = setTimeout(function(){
                    localDone = true;
                    if (!networkDone) {
                        console.log('trigger success load from local storage for ' + uri);
                        onSuccess(obj);

                        if (typeof options.usenetwork === 'string') {
                            // TODO: should check the string to see how old we keep the data
                            var cacheDelay = 1000 * 60 * 60 * 24;
                            var cachedTimestamp = localStorage.getItem(uri + '//cachedTimestamp');
                            if (!cachedTimestamp || (new Date().getTime() - cachedTimestamp > cacheDelay)) {
                                console.log('local data expired for ' + uri);
                                loadFromNetwork();
                            } else {
                                console.log('local data up to date for ' + uri);
                                dfd.resolve(obj);
                            }
                        } else if (options.usenetwork === false) {
                            dfd.resolve(obj);
                        }
                    }
                    localTimeout = null;
                }, 50);
            } else {
                if (options.usenetwork === false) {
                    dfd.resolve(null);
                } else if (typeof options.usenetwork === 'string') {
                    loadFromNetwork();
                }
            }
        }
        function loadFromNetwork() {
            models.Device.current().whenReady(function() {
                if (!models.Device.current().offline()) {
                    // refresh
                    $.ajax({
                        url: uri.substring(0,4) == 'http' ? uri : (models.baseUrl + uri),
                        dataType:"json",
                        type: "GET",
                        data: {},
                        beforeSend: function(xhr) {
                            // BASIC authentication
                            if (options.authenticate) {
                                var username = models.User.current().name();
                                var password = ''; // no password to authenticate ATM
                                xhr.setRequestHeader("Authorization", username);
                            }
                        },
                        success: function(objFromServer) {
                            var jsonFromServer = JSON.stringify(objFromServer);
                            networkDone = true;
                            if (obj && obj.lastmodified) {
                                if (obj.lastmodified === objFromServer.lastmodified) {
                                    console.log('got un modified data from server for ' + uri);
                                    if (!localDone) {
                                        console.log('trigger success load from server for ' + uri);
                                        onSuccess(objFromServer);
                                    }
                                    dfd.resolve(obj);
                                    return;
                                } else if (obj.lastmodified < objFromServer.lastmodified) {
                                    console.log('data from server is more recent than local data for ' + uri);
                                } else {
                                    console.log('!!! local data is more recent than remote data for ' + uri);
                                }
                            }
                            if (localTimeout) {
                                // if ever we reach that before the timeout expired, clear it
                                clearTimeout(localTimeout);
                            }
                            getJSON.updateLocalCache(uri, jsonFromServer);
                            console.log('trigger success load from server for ' + uri);
                            onSuccess(objFromServer);
                            dfd.resolve(objFromServer);
                        },
                        error: function() {
                            console.log('error occured while loading ', uri);
                            dfd.reject();
                        }
                    });
                } else {
                    if (localDone) {
                        dfd.resolve(obj);
                    }
                }
            });
        }
        if (options.usenetwork == true) loadFromNetwork();
    }, 0);
    return dfd.promise();
}

getJSON.updateLocalCache = function(uri, val) {
    localStorage.setItem(uri, val);
    localStorage.setItem(uri + '//cachedTimestamp', new Date().getTime());
}

getJSON.clearLocalCache = function(uri) {
    localStorage.removeItem(uri);
    localStorage.removeItem(uri + '//cachedTimestamp');
}

function mergeData(data, self) {
    if (data && data.id) {
        if (self.data().id == data.id) {
            self.data(_.extend(self.data(), data));
        } else {
            self.data(data);
        }
    } else {
        self.data({});
    }
    return self.data();
}

function currentModelObject() {
    var current = ko.observable();
    current.subscribe(function(value) {
        if (value) {
            value.quit();
        }
    }, null, "beforeChange");
    current.subscribe(function(value) {
        if (value) {
            value.enter();
        }
    });
    return current;
}

// Used to workaround an issue where safari doesn't parse correctly Date.parse("2014-04-16 08:00:00.0")
// because it expects a "T" instead of a space (Date.parse("2014-04-16T08:00:00.0") is fine)
function parseDateFromStr(str) {
    var a = str.split(/[^0-9]/);
    return new Date (a[0],a[1]-1,a[2],a[3],a[4],a[5] );
}
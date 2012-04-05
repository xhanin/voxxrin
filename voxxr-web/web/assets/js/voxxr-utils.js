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
    whenDeviceReady(function() {
        if (!models.Device.current().offline()) {
            // refresh
            $.ajax({
                url: models.baseUrl + uri,
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
                },
                error: function() {
                    console.log('error occured while posting ', uri);
                }
            });
        }
    });
}

function getJSON(uri, onSuccess, options) {
    options = _.extend(options || {}, {uselocal: true, usenetwork: true});
    setTimeout(function(){
        console.log('getting data for ' + uri);
        var obj = null;
        var localTimeout = null;
        if (options.uselocal) {
            var json = localStorage.getItem(uri);
            console.log('parsing data for ' + uri);
            obj = json ? JSON.parse(json) : null;
            if (json) {
                // call success callback in a few ms to call it asynchronously in any case
                localTimeout = setTimeout(function(){
                    console.log('trigger success load from local storage for ' + uri);
                    onSuccess(obj);
                    localTimeout = null
                }, 50);
            }
        }
        if (!options.usenetwork) return;
        whenDeviceReady(function() {
            if (!models.Device.current().offline()) {
                // refresh
                $.ajax({
                    url: models.baseUrl + uri,
                    dataType:"text",
                    type: "GET",
                    beforeSend: function(xhr) {
                        // BASIC authentication
                        var username = models.User.current().name();
                        var password = ''; // no password to authenticate ATM
                        xhr.setRequestHeader("Authorization", username);
                    },
                    success: function(jsonFromServer) {
                        var objFromServer = JSON.parse(jsonFromServer);
                        if (obj && obj.lastmodified && obj.lastmodified == objFromServer.lastmodified) {
                            console.log('got un modified data from server for ' + uri);
                            return; // success callback is / will be called from local data which is the same
                        }
                        console.log('trigger success load from server for ' + uri);
                        if (localTimeout) {
                            // if ever we reach that before the timeout expired, clear it
                            clearTimeout(localTimeout);
                        }
                        localStorage.setItem(uri, jsonFromServer);
                        onSuccess(objFromServer);
                    },
                    error: function() {
                        console.log('error occured while loading ', uri);
                    }
                });
            }
        });
    }, 0);
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

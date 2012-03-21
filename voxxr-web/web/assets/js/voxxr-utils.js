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


function getJSON(uri, onSuccess) {
    var json = localStorage.getItem(uri);
    var localTimeout = null;
    if (json) {
        // call success callback in a few ms to call it asynchronously in any case
        localTimeout = setTimeout(function(){ onSuccess(JSON.parse(json)); localTimeout = null }, 50);
    }
    whenDeviceReady(function() {
        if (!models.Device.current().offline()) {
            // refresh
            $.ajax({
                url: models.baseUrl + uri,
                dataType:"text",
                type: "GET",
                success: function(json) {
                    if (localTimeout) {
                        // if ever we reach that before the timeout expired, clear it
                        clearTimeout(localTimeout);
                    }
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

function currentModelObject(current, propsToSync) {
    var subscriptions = [];
    return ko.computed({
        read: function(newObj) {
            return current;
        },
        write: function(newObj) {
            _(subscriptions).each(function(subscription) {
                subscription.dispose();
            })
            subscriptions = [];
            if (current.id()) {
                current.quit();
            }
            if (newObj) {
                current.load(newObj.data());
                subscriptions.push(newObj.data.subscribe(function(newValue) {
                    current.load(newValue);
                }));
                if (propsToSync) {
                    _(propsToSync).each(function(propToSync) {
                        subscriptions.push(newObj[propToSync].subscribe(function(newValue) {
                            current[propToSync](newValue);
                        }));
                    });
                }
            } else {
                current.load({});
            }
            if (current.id()) {
                current.enter();
            }
        }
    });
}
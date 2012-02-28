(function(exports) {

    var Speaker = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.uri = ko.observable(data.uri);
        self.name = ko.observable(data.name);
    }

    exports.models = exports.models || {};
    exports.models.Speaker = Speaker;
})(window);
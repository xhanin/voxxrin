(function(exports) {

    var User = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.name = ko.observable(data.name);
    }
    User.current = ko.observable(new User({name: 'anonymous'}));

    exports.models = exports.models || {};
    exports.models.User = User;
})(window);
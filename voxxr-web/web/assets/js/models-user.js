(function(exports) {

    var User = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.name = ko.observable(data.name);
    }
    User.current = ko.observable(new User({name: 'a@' + models.Device.current().id()}));
    models.Device.current().id.subscribe(function(newValue) {
        User.current().name('a@' + newValue);
        console.log('User is ' + User.current().name());
    });
    console.log('User is ' + User.current().name());

    exports.models = exports.models || {};
    exports.models.User = User;
})(window);
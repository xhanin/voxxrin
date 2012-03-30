(function(exports) {

    var MyPresentation = function(my, data) {
        var self = this;
        self.data = data;

        self.favorite = ko.observable(self.data.favorite?true:false);

        self.favorite.subscribe(function(newValue) {
            self.data.favorite = newValue;
            var p = ds.presentation({id: self.data.presId, eventId:self.data.eventId});
            if (p.title()) {
                if (newValue) {
                    p.favorites(p.favorites() + 1);
                } else {
                    p.favorites(p.favorites() - 1);
                }
            }
            postJSON('/events/' + self.data.eventId + '/presentations/' + self.data.presId + '/my', self.data, function() {
                my.store();
            });
        });
    }

    var My = function(data) {
        var self = this;

        function loadData(data) {
            self.data = data;
        }


        function save() {
            postJSON('/my', self.data);
            store();
        }

        function store() {
            localStorage.setItem('/my', JSON.stringify(self.data));
        }

        loadData(data);

        self.save = save;
        self.store = store;

        self.presentations = {};

        self.presentation = function(eventId, presId) {
            if (!eventId || !presId) {
                return new MyPresentation(self, {me: self.data.id, eventId: eventId, presId: presId});
            }
            if (!self.presentations[eventId + '/' + presId]) {
                var event = self.data.events[eventId];
                if (!event) {
                    event = { id: eventId, presentations: {} };
                    self.data.events[eventId] = event;
                }
                var pres = event.presentations[presId];
                if (!pres) {
                    pres = {me: self.data.id,  eventId: eventId, presId: presId, favorite: false};
                    event.presentations[presId] = pres;
                }
                self.presentations[eventId + '/' + presId] = new MyPresentation(self, pres);
            }
            return self.presentations[eventId + '/' + presId];
        }
    }

    var User = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.name = ko.computed(function() {
            var name = (self.id() || 'a') + "@" + models.Device.current().id();
            console.log('User is ' + name);
            return name;
        });

        self.my = ko.observable(new My({events: {}}));

        getJSON('/my', function(data) {
            self.my(new My(data))
        });
    }
    User.current = ko.observable(new User({id: ''}));
    console.log('User is ' + User.current().name());

    exports.models = exports.models || {};
    exports.models.User = User;
})(window);
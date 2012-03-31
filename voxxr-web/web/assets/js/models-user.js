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

    var TwUser = function(data, options) {
        var self = this;
        data = data || {};
        options = options || {};
        self.id = ko.observable(data.id || 0);
        self.screenname = ko.observable(data.screen_name || '');
        self.name = ko.observable();
        self.pictureURL = ko.observable();
        self.location = ko.observable();
        self.followers = ko.observableArray([]);
        self.friends = ko.observableArray([]);
        self.ready = ko.observable(false);
        self.loading = ko.observable(false);

        function loadData(data) {
            self.id(data.id);
            self.screenname(data.screen_name);
            self.name(data.name);
            self.pictureURL(data.profile_image_url);
            self.location(data.location);
            self.loading(false);
            self.ready(true);
        }
        
        function load() {
            if (self.screenname() || self.id()) {
                self.loading(true);

                var param = self.id() ? 'user_id=' + self.id() : 'screen_name=' + self.screenname();
                $.getJSON(
                    'https://api.twitter.com/1/users/lookup.json?' + param + '&callback=?',
                    {},
                    function(data) {
                        loadData(data[0]);
                        if (options.autoLoadFollowers) {
                            self.loadFollowers();
                        }
                        if (options.autoLoadFriends) {
                            self.loadFriends();
                        }
                    });

            } else {
                loadData({});
            }
        }

        if (self.screenname() || self.id()) {
            if (options.autoLoad) {
                load();
            }
        }

        self.loadFollowers = function() {
            $.getJSON(
                'https://api.twitter.com/1/followers/ids.json?cursor=-1&user_id=' + self.id() + '&callback=?',
                {},
                function(data) {
                    self.followers(_(data.ids).map(function(twitterid) { return ds.twUser({id: twitterid}) }));
                });
        }
        self.loadFriends = function() {
            $.getJSON(
                'https://api.twitter.com/1/friends/ids.json?cursor=-1&user_id=' + self.id() + '&callback=?',
                {},
                function(data) {
                    self.friends(_(data.ids).map(function(twitterid) { return ds.twUser({id: twitterid}) }));
                });
        }

        self.loadDetails = function() {
            if (!self.pictureURL()) {
                load();
            }
        };

        if (options.autoLoad) {
            self.screenname.subscribe(load);
            self.id.subscribe(load);
        }
    }

    var User = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.twuser = ko.observable(new TwUser({screen_name: data.id}, {autoLoad: true, autoLoadFollowers: true, autoLoadFriends: true}));
        self.name = ko.computed(function() {
            var name = (self.id() || 'a')
                + (self.twuser().id() ? '(' + self.twuser().id() + ')' : '')
                + "@" + models.Device.current().id()
                ;
            console.log('User is ' + name);
            return name;
        });
        self.id.subscribe(function(newValue) {
            localStorage.setItem('userId', newValue);
            loadMy();
            self.twuser().screenname(newValue);
        });

        self.my = ko.observable(new My({events: {}}));

        function loadMy() {
            getJSON('/my', function(data) {
                self.my(new My(data))
            });
        }

        loadMy();
    }
    var userId = localStorage.getItem('userId') || '';
    User.current = ko.observable(new User({id: userId}));
    console.log('User is ' + User.current().name());

    exports.models = exports.models || {};
    exports.models.User = User;
    exports.models.TwUser = TwUser;
})(window);
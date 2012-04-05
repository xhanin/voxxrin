(function(exports) {
    var Presences = {NO:'NO', IN:'IN', WAS:'WAS'}
    var MyPresentation = function(data, my) {
        var self = this;
        self.data = ko.observable(data);
        self.data().id = data.id || (data.userid + '/' + data.eventId + '/' + data.presId);

        self.id = ko.observable(self.data().id);
        self.twuser = ko.observable(self.data().twitterid ? ds.twUser({id: self.data().twitterid}).loadDetails() : null);
        self.favorite = ko.observable();
        self.presence = ko.observable(Presences.NO);
        self.feelings = {
            applause: ko.observable(0),
            yawn: ko.observable(0),
            wonder: ko.observable(0)
        };
        _(self.feelings).each(function(feeling, k) {
            feeling.inc = function() { feeling(feeling() + 1) };
            feeling.subscribe(function(newValue) { self.data()[k + 'Count'] = newValue });
        } );

        self.feelings.byCode = {
            A: self.feelings.applause,
            Y: self.feelings.yawn,
            W: self.feelings.wonder
        };
        self.rate = new models.PresentationRate();
        self.rate.nb.subscribe(function(newValue) {self.data().rateCount = newValue});
        self.rate.avg.subscribe(function(newValue) {self.data().rateAvg = newValue});

        function loadFromData() {
            self.favorite(self.data().favorite?true:false);
            self.presence(self.data().presence);
            self.feelings.applause(self.data().applauseCount || 0);
            self.feelings.yawn(self.data().yawnCount || 0);
            self.feelings.wonder(self.data().wonderCount || 0);
            self.rate.nb(self.data().rateCount || 0);
            self.rate.avg(self.data().rateAvg || 0);
        }

        self.load = function(data) {
            self.data(_.extend(self.data(), data));
            loadFromData();
        }

        loadFromData();

        if (my) {
            function sendToServer() {
                if (!self.data().eventId || !self.data().presId || !self.data().userid) return;
                postJSON('/events/' + self.data().eventId + '/presentations/' + self.data().presId + '/my', self.data(),
                    function() {
                        my.store();
                    });
            }
            self.joined = function(joined) {
                var prevPresence = self.presence();
                if (!joined) {
                    if (self.presence() == Presences.IN) {
                        self.presence(Presences.WAS);
                    }
                } else {
                    if (self.presence() == Presences.NO || self.presence() == Presences.WAS) {
                        self.presence(Presences.IN);
                    }
                }
                if (prevPresence !== self.presence()) {
                    self.data().presence = self.presence();
                    sendToServer();
                }
            }
            self.favorite.subscribe(function(newValue) {
                self.data().favorite = newValue;
                var p = ds.presentation({id: self.data().presId, eventId:self.data().eventId});
                if (p.title()) {
                    if (newValue) {
                        p.favorites(p.favorites() + 1);
                    } else {
                        p.favorites(p.favorites() - 1);
                    }
                }
                sendToServer();
            });
            // register on rate and feelings change to notify the server, with a throttle of 5s
            ko.computed(function() {
                self.rate.nb() + self.rate.avg();
                _(self.feelings.byCode).each(function(feeling) { feeling() });

                sendToServer();
            }, this).extend({ throttle: 5000 });
        }
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
                return null;
            }
            if (!self.presentations[eventId + '/' + presId]) {
                var event = self.data.events[eventId];
                if (!event) {
                    event = { id: eventId, presentations: {} };
                    self.data.events[eventId] = event;
                }
                var pres = event.presentations[presId];
                if (!pres) {
                    pres = {userid: self.data.id, twitterid: self.data.twitterid, deviceid: self.data.deviceid,
                        eventId: eventId, presId: presId, favorite: false};
                    event.presentations[presId] = pres;
                }
                self.presentations[eventId + '/' + presId] = new MyPresentation(pres, self);
            }
            return self.presentations[eventId + '/' + presId];
        }
    }
    function isNonNull(a) {
            return a && a !== "null" && a !== "undefined";
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

        function isAuthenticated() {
            return isNonNull(self.id()) || isNonNull(self.screenname());
        }

        function loadData(data) {
            self.id(data.id);
            self.screenname(data.screen_name);
            self.name(data.name);
            self.pictureURL(data.profile_image_url);
            self.location(data.location);
            self.loading(false);
            self.ready(data.profile_image_url ? true : false);
        }
        
        function load() {
            if (isAuthenticated()) {
                loadData({id: self.id(), screen_name: self.screenname()}); // reset
                self.loading(true);
                var param = isNonNull(self.id()) ? 'user_id=' + self.id() : 'screen_name=' + self.screenname();
                console.log('loading twitter account details with param' + param);
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

        if (isAuthenticated()) {
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
            return self;
        };

        if (options.autoLoad) {
            ko.computed(function() {
                self.screenname() + self.id(); // register on these values
                load();
            }, this).extend({ throttle: 1 });
        }
    }

    var User = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.twuser = ko.observable(new TwUser({id: data.twitterid, screen_name: data.id}, {autoLoad: true, autoLoadFollowers: true, autoLoadFriends: true}));
        self.name = ko.computed(function() {
            var name = (isNonNull(self.id()) ? self.id() : 'a')
                + (isNonNull(self.twuser().id()) ? '(' + self.twuser().id() + ')' : '')
                + "@" + models.Device.current().id()
                ;
            console.log('User is ' + name);
            return name;
        });
        self.id.subscribe(function(newValue) {
            self.twuser().id(null);
            self.twuser().screenname(newValue);
        });
        self.name.subscribe(function() {
            localStorage.setItem('userId', isNonNull(self.id()) ? self.id() : null);
            localStorage.setItem('twitterid', isNonNull(self.twuser().id()) ? self.twuser().id() : null);
            loadMy();
        });

        self.my = ko.observable(new My({events: {}}));

        function loadMy() {
            getJSON('/my', function(data) {
                if (self.twuser().screenname() == data.id) {
                    data.twitterid = self.twuser().id();
                }
                data.deviceid = models.Device.current().id();
                self.my(new My(data))
            });
        }

        loadMy();
    }
    whenDeviceReady(function() {
        var userId = localStorage.getItem('userId') || '';
        userId = isNonNull(userId) ? userId : '';
        var twitterid = urlParams['twitterid'] || localStorage.getItem('twitterid') || '';
        twitterid = isNonNull(twitterid) ? twitterid : '';
        User.current(new User({id: userId, twitterid: twitterid}));
    });
    User.current = ko.observable();

    exports.models = exports.models || {};
    exports.models.User = User;
    exports.models.TwUser = TwUser;
    exports.models.MyPresentation = MyPresentation;
})(window);

(function(exports) {
    var Event = function(data) {
        var self = this;
        self.id = ko.observable();
        self.uri = ko.observable();
        self.title = ko.observable();
        self.subtitle = ko.observable();
        self.from = ko.observable();
        self.to = ko.observable();
        self.nbPresentations = ko.observable();
        self.dates = ko.observable();
        self.nowplaying = ko.observableArray([]);
        self.days = ko.observableArray([]);
        self.remaining = ko.observable();
        self.since = ko.observable();
        self.hash = ko.computed(function() {return "#event>" + self.id()});
        self.nowplaying.hash = ko.computed(function() {return "#nowplaying>" + self.id()});
        self.data = ko.observable({});
        self.loading = ko.observable(false);
        var crons = {};

        function load(data) {
            data = mergeData(data, self);
            if (!data.id) {
                self.remaining("");
                self.since("");
                self.nowplaying([]);
            }
            self.id(data.id);
            self.uri(data.id ? (data.uri || ('/events/' + data.id)) : '');
            self.title(data.title);
            self.subtitle(data.subtitle);
            self.from(data.from);
            self.to(data.to);
            self.nbPresentations(data.nbPresentations);
            self.dates(data.dates);
            if (data.nowplaying) {
                self.nowplaying(_(data.nowplaying).map(function(presentation) {
                    var p = ds.presentation(_.extend(presentation, {eventId: self.id()}));
                    p.playing(true);
                    return p;
                }));
            }
            self.days(_(data.days).map(function(day) { return ds.scheduleDay(_.extend(day, {eventId: self.id()}));}));
            self.loading(false);
        }

        load(data);

        function updateRemaining() {
            var remainingSeconds = remaining.getSeconds(self.from());
            if (remainingSeconds > 0) {
                self.remaining(remaining.getString(remainingSeconds) + " remaining");
                crons.remaining = setTimeout(updateRemaining, 1000);
            } else {
                self.remaining("");
                self.refreshNowPlaying();
            }
        }
        function updateSince() {
            var sinceSeconds = -remaining.getSeconds(self.to());
            if (sinceSeconds > 0) {
                self.since(remaining.getString(sinceSeconds) + " ago");
                crons.since = setTimeout(updateSince, 1000);
            } else {
                self.since("");
            }
        }

        self.refreshNowPlaying = function() {
            console.log("refreshing now playing");
            $.ajax({
                url: models.baseUrl + "/events/" + self.id() + "/nowplaying",
                dataType:"json",
                success: function(data) {
                    var wasplaying = self.nowplaying();
                    self.data(_.extend(self.data(), {nowplaying: data}));

                    self.nowplaying(_(data).map(function(presentation) {
                        var p = ds.presentation(_.extend(presentation, {eventId: self.id()}));
                        p.load({id: p.id(), playing: true});
                        wasplaying = _(wasplaying).reject(function(e) { return e.id() === p.id() });
                        return p;
                    }));

                    // reset playing status for old nowplaying presentations
                    _(wasplaying).each(function(p) {
                        p.load({id: p.id(), playing: false});
                    });

                    // auto update
                    if (crons.refreshNowPlaying) {
                        clearTimeout(crons.refreshNowPlaying);
                        crons.refreshNowPlaying = null;
                    }
                    var refreshIn = 15000;
                    if (data.length === 0) {
                        var remainingSeconds = remaining.getSeconds(self.from());
                        if (remainingSeconds > 0) {
                            console.log("event not started yet");
                            refreshIn = (remainingSeconds * 1000) - (5 * 60 * 1000);
                        } else {
                            var sinceSeconds = -remaining.getSeconds(self.to());
                            if (sinceSeconds > (5 * 60 * 1000)) {
                                console.log("event finished");
                                return;
                            }
                        }
                    }
                    // never shedule auto refresh for more than 2 days
                    // http://stackoverflow.com/questions/3468607/why-does-settimeout-break-for-large-millisecond-delay-values
                    if (refreshIn < 172800000) {
                        refreshIn = Math.max(refreshIn, 15000); // never refresh faster than every 15 seconds
                        console.log("scheduling now playing auto refresh in ", (refreshIn / 1000), " s");
                        crons.refreshNowPlaying = setTimeout(self.refreshNowPlaying, refreshIn);
                    }
                },
                error: function() {
                    console.log("error when getting now playing, retry in 15 seconds");
                    crons.refreshNowPlaying = setTimeout(self.refreshNowPlaying, 15000);
                }
            });
        }

        self.enter = function() {
            self.autorefresh(true);
        }

        self.quit = function() {
            self.autorefresh(false);
        }

        self.autorefresh = function(b) {
            if (self.autorefresh.status === b) return;
            self.autorefresh.status = b;
            if (b) {
                console.log('autorefresh is now ON for ' + self.id());
                self.refreshNowPlaying();
                updateRemaining();
                updateSince();
            } else {
                 _(crons).each(function(cron, key) {
                    if (cron) {
                        clearTimeout(cron);
                        crons[key] = null;
                    }
                });
                console.log('autorefresh is now OFF for ' + self.id());
            }
        }

        self.load = function(data, onloaded) {
            if (data) {
                load(data);
                if (onloaded) onloaded(self);
            } else {
                if (!self.title()) { // check if already loaded
                    self.loading(true);
                    getJSON(self.uri(),
                        function(data) {
                            load(data); if (onloaded) onloaded(self);
                        });
                } else {
                     if (onloaded) onloaded(self);
                }
            }
        }
    }
    Event.current = currentModelObject(new Event({}));


    exports.models = exports.models || {};
    exports.models.Event = Event;
})(window);
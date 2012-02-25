_.mixin({
  capitalize : function(string) {
    return string.charAt(0).toUpperCase() + string.substring(1);
  }
});

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


var jQT = new $.jQTouch({
    statusBar: 'black'
});

$(function() {

//    var baseUrl = "http://localhost:8080/r";
    var baseUrl = "http://voxxr-web.appspot.com/r";

    
    var models = {};
    models.Room = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.uri = ko.observable(data.uri);
        self.name = ko.observable(data.name);
        self.rt = ko.observable(null);
        self.connections = ko.observable(0);
        self.currentPresentation = ko.observable(null);
        self.status = ko.observable(models.Room.DISCONNECTED);  
        self.message = ko.observable(null);
        self.connected = ko.computed(function() {
            return self.status() === models.Room.CONNECTED;
        });
        self.connecting = ko.computed(function() {
            return self.status() === models.Room.CONNECTING;
        });

        self.join = function() {
            voxxr.currentRoom(self);
            self.connect();
        };
        self.leave = function() {
            self.quit();
            jQT.goBack();
        };
        self.quit = function() {
            console.log("quitting room ", self.name());
            self.disconnect();
            voxxr.currentRoom(null);
        };

        self.connect = function() {
            if (self.status() === models.Room.DISCONNECTED) {
                self.message("Connecting to room...");
                self.status(models.Room.CONNECTING);
                $.ajax({
                    type: "GET",
                    url: self.rt() + "/r/room",
                    dataType:"json",
                    success: function(resp) {
                        if (resp.status === 'ok') {
                            self.connections(resp.connections);
                            self.currentPresentation().title(resp.title);
                            self.currentPresentation().rate.nb(resp.ratings);
                            self.currentPresentation().rate.avg(resp.rate * 100);
                            self.message(null);
                            self.status(models.Room.CONNECTED);
                            subscribe();
                        } else {
                            self.message(resp.message);
                            self.status(models.Room.DISCONNECTED);
                        }
                    },
                    error: function(xhr, type) {
                        console.error('-------------- CONNECTION ERROR', xhr);
                        self.message("Can't connect to room. Is it currently opened?");
                        self.status(models.Room.DISCONNECTED);
                    }
                });
            }
        };

        self.reconnect = function() {
            self.disconnect();
            self.connect();
        };

        self.disconnect = function() {
            if (self.status() !== models.Room.DISCONNECTED) {
                $.atmosphere.closeSuspendedConnection();
            }
            self.message(null);
            self.status(models.Room.DISCONNECTED);
        };

        function loadData(data) {
            if (data.rt) self.rt(data.rt);
        }
        self.load = function(data) {
            if (data) {
                loadData(data);
            } else {
                $.getJSON(baseUrl + self.uri(), loadData);
            }
        }

        loadData(data);
    };
    models.Room.DISCONNECTED = "disconnected";
    models.Room.CONNECTED = "connected";
    models.Room.CONNECTING = "connecting";

    models.Speaker = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.uri = ko.observable(data.uri);
        self.name = ko.observable(data.name);
    }

    models.PresentationRate = function() {
        var self = this;
        self.nb = ko.observable(0);
        self.avg = ko.observable(0);
        self.avgDisplay = ko.computed(function() {
            return (self.avg() / 100).toFixed(2);
        });
    }

    models.PresentationPoll = function(data) {
        var self = this;
        self.choices = ko.observableArray(data.choices);
    }
    
    models.Presentation = function(data) {
        var self = this;

        self.id = ko.observable(data.id);
        self.uri = ko.observable(data.uri);
        self.title = ko.observable(null);
        self.speakers = ko.observableArray(null);
        self.slot = ko.observable(null);
        self.fromTime = ko.observable(null);
        self.toTime = ko.observable(null);
        self.room = ko.observable(null);
        self.summary = ko.observable(null);
        self.playing = ko.observable(false);
        self.rate = new models.PresentationRate();
        self.currentPoll = ko.observable(null);
        self.loading = ko.observable(false);

        self.speakerNames = ko.computed(function() {
            return _(this.speakers()).map(function(s){return s.name();}).join(', ');
        }, self);
        self.shortSummary = ko.computed(function() {
           return (self.summary() && self.summary().length > 200) ?
               self.summary().substring(0, 197) + "..."
               : self.summary();
        });

        function loadData(data) {
            self.title(data.title);
            self.speakers(_(data.speakers).map(function(s) { return voxxr.speaker(s);}));
            self.slot(data.slot);
            self.fromTime(data.fromTime);
            self.toTime(data.toTime);
            self.room(voxxr.room(data.room));
            self.summary(data.summary);
            self.loading(false);
        }

        self.load = function(data) {
            if (data) {
                loadData(data);
            } else {
                if (!self.summary()) { // check if already loaded
                    self.loading(true);
                    $.getJSON(baseUrl + self.uri(), loadData);
                }
            }
        }

        loadData(data);

        self.quit = function() {}
    }

    models.ScheduleSlot = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.name = ko.observable(data.name);
        self.nbPresentations = ko.observable(data.presentations.length);
        self.presentations = ko.observableArray(_(data.presentations).map(function(presentation) { return voxxr.presentation(presentation); }));
    }

    models.ScheduleDay = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.uri = ko.observable(data.uri);
        self.name = ko.observable(data.name);
        self.nbPresentations = ko.observable(data.nbPresentations);
        self.presentations = ko.observableArray([]);
        self.slots = ko.observableArray([]);
        self.slots.loading = ko.observable(false);


        self.refreshPresentations = function() {
            self.slots.loading(true);
            $.getJSON(baseUrl + self.uri(), function(data) {
                var schedule = data.schedule;
                self.presentations(_(schedule).map(function(presentation) { return voxxr.presentation(presentation); }));
                self.slots(_.chain(schedule).groupBy('slot').map(function(pres, slot) {
                    return voxxr.scheduleSlot({id: self.id + '/' + slot, name: slot, presentations: pres});
                }).value());
                self.nbPresentations(schedule.length);
                self.slots.loading(false);
            });
        }

        self.quit = function() {}
    }

    models.Event = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.title = ko.observable(data.title);
        self.subtitle = ko.observable(data.subtitle);
        self.from = ko.observable(data.from);
        self.to = ko.observable(data.to);
        self.nbPresentations = ko.observable(data.nbPresentations);
        self.dates = ko.observable(data.dates);
        self.nowplaying = ko.observableArray([]);
        self.days = ko.observableArray(_(data.days).map(function(day) { return voxxr.scheduleDay(day);}));
        self.remaining = ko.observable();
        self.since = ko.observable();
        var crons = {};

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
                url: baseUrl + "/events/" + self.id() + "/nowplaying",
                dataType:"json",
                success: function(data) {
                    var wasplaying = self.nowplaying();

                    self.nowplaying(_(data).map(function(presentation) {
                        var p = voxxr.presentation(presentation);
                        p.playing(true);
                        p.room().currentPresentation(p);
                        wasplaying = _(wasplaying).reject(function(e) { return e.id() === p.id() });
                        return p;
                    }));

                    // reset playing status for old nowplaying presentations
                    _(wasplaying).each(function(p) {
                        p.playing(false);
                        if (p.room().currentPresentation() === p) {
                            p.room().currentPresentation(null);
                        }
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
            }
        }

    }

    function VoxxrViewModel() {
        var self = this;
        self.events = ko.observableArray([]);
        self.events.loading = ko.observable(false);
        self.chosenEvent = ko.observable(null);
        self.chosenDay = ko.observable(null);
        self.chosenPresentation = ko.observable(null);
        self.currentRoom = ko.observable(null);
        self.user = ko.observable({ name: ko.observable("anonymous") });

        // factories / data storage
        function factory(cache, type, data) {
            var o;
            if (data.id) {
                o = cache[data.id];
                if (o) {
                    if (o.load) { o.load(data); }
                    return o;
                }
            }
            o = new models[_(type).capitalize()](data);
            if (data.id) {
                cache[data.id] = o;
            }
            return o;
        }

        _(['event', 'scheduleDay', 'scheduleSlot', 'presentation', 'speaker', 'room'])
                .each(function(type) {
            self[type + 'Cache'] = {};
            self[type] = function(data) {
                return factory(self[type + 'Cache'], type, data);
            }
        });

        // change current selection function
        self.selectEvent = function(event) {
            event.enter();
            self.chosenEvent(event);
        };

        self.selectDay = function(day) {
            day.refreshPresentations();
            self.chosenDay(day);
        };

        self.selectPresentation = function(presentation) {
            presentation.load();
            self.chosenPresentation(presentation);
        };

        // load
        self.events.loading(true);
        $.getJSON(baseUrl + "/events", function(data) {
            self.events.loading(false);
            self.events(_(data).map(function(event) { return voxxr.event(event); }));
        });
    };

    var voxxr = new VoxxrViewModel();
    ko.applyBindings(voxxr);


    var transport = "long-polling";
//    if ('WebSocket' in window) {
//        transport = "websocket";
//    }
    function subscribe() {
        console.info('-------------- SUBSCRIBING TO ', voxxr.currentRoom().rt(), '/r/room/rt', ' with transport ', transport);
        $.atmosphere.subscribe(
            voxxr.currentRoom().rt() + '/r/room/rt',
            function(response) {
                var room = voxxr.currentRoom();
                if (response.state == 'error' || response.state == 'closed') {
                    room.message("Room connection lost");
                    room.status(models.Room.DISCONNECTED);
                    return;
                }
                if (response.transport != 'polling'
                    && response.state != 'connected' && response.state != 'closed') {
                    if (response.status == 200) {
                        var data = response.responseBody;
                        if (data.length > 0) {
                            var f = parseFeedback(data);

                            if (f.isConnection) {
                                room.connections(f.connections);
                            }
                            var pres = room.currentPresentation();
                            if (f.isTitle) {
                                pres.title(f.title);
                            }
                            if (f.isPollStart) {
                                pres.currentPoll(new models.PresentationPoll({
                                    choices: _(f.items).map(function(e,i) { return {title: e, index: i}; })
                                }));
                                $("#roomRT .tabs a.poll").text('< POLL >')
                                    .gfxShake({distance: 20, duration: 100});
                            }
                            if (f.isPollEnd) {
                                pres.currentPoll(null);
                                $("#roomRT .tabs a.poll").text('POLL')
                                    .gfxShake({distance: 20, duration: 100});
                            }
                            if (f.isRate) {
                                var rate = pres.rate;
                                rate.avg(((rate.avg() * rate.nb()) + (f.rateValue * 100)) / (rate.nb() + 1));
                                rate.nb(rate.nb() + 1);
                            }

                        }
                    }
                }
            },
            $.atmosphere.request = { transport: transport });
    }

    // COMMON
    function feedback(user, v) {
        return user + '|' + v;
    }

    function parseFeedback(f) {
        var parts = f.split('|');
        var feedback = {};
        if (parts.length > 2) {
            feedback.room = parts[0];
            feedback.user = parts[1];
            feedback.value = parts[2];
        } else {
            feedback.room = voxxr.currentRoom() ? voxxr.currentRoom().id() : null;
            feedback.user = parts[0];
            feedback.value = parts[1];
        }

        feedback.isRate = feedback.value.substr(0,1) === 'R';
        if (feedback.isRate) {
            feedback.rateValue = feedback.value.substr(1);
            feedback.index = feedback.rateValue;
        }
        feedback.isConnection = feedback.value.substr(0,1) === 'C';
        if (feedback.isConnection) {
            feedback.connections = feedback.value.substr(1);
        }
        feedback.isTitle = feedback.value.substr(0,1) === 'T';
        if (feedback.isTitle) {
            feedback.title = feedback.value.substr(1);
        }
        feedback.isPollStart = feedback.value.substr(0,2) === 'PS';
        if (feedback.isPollStart) {
            feedback.items = feedback.value.substr(2).split(',');
        }
        feedback.isPollEnd = feedback.value.substr(0,2) === 'PE';

        return feedback;
    }

    function sendFeedback(f, onsuccess, onerror) {
        console.debug('--------------  FEEDBACK ', f, ' ON ', voxxr.currentRoom().rt(), "/r/feedback");
        $.ajax({
            type: "POST",
            url: voxxr.currentRoom().rt() + "/r/feedback",
            data: feedback(voxxr.user().name(), f),
            dataType:"json",
            success: function( resp ) {
                if (resp.status === 'ok') {
                    console.debug('-------------- FEEDBACK SUCCESS ', f);
                    if (onsuccess) onsuccess(resp);
                }
            },
            error: function(xhr, type) {
                console.error('-------------- FEEDBACK ERROR' + xhr);
                if (onerror) onerror();
            }
        });
    }

    (function() {
        var myRate = {avg: 0, last: 0};

        $("#feedback .rate .star").live('tap', function() {
            vote($(this).attr('data-rate'));
            return false;
        });

        function setVotes(rate, style) {
            rate = rate || myRate.last;
            style = style || 'vote';
            for (var i = 1; i <= 5; i++) {
                var v = $("#feedback .rate").find('[data-rate="' + i + '"]');
                v.removeClass('vote').removeClass('voting');
                if (i<=rate) {
                    v.addClass(style);
                }
            }
        }

        function vote(r) {
            setVotes(r, 'voting');
            sendFeedback("R" + r, function() { myRate.last = r; setVotes();}, function() { setVotes(); });
        }

        $("#feedback .feeling a").live('tap', function() {
            feeling($(this).attr('data-value'));
        });

        function feeling(r) {
            sendFeedback("F" + r, function() {
                $("#feedback .feeling a[data-value='" + r + "']").gfxFlipIn({});
            });
        }

        $("#roomRT #poll ul li a").live('tap', function() {
            var r = $(this).attr('data-value');
            sendFeedback("PV" + r, function() {
                $("#roomRT #poll ul li a").removeClass("current");
                $("#roomRT #poll ul li a[data-value='" + r + "']").addClass("current");
            });
        });
    })();

    // tabs handling
    $("#roomRT .tabs a.rate").live('tap', function() {
        $("#roomRT .tabs a").removeClass("current");
        $(this).addClass("current");
        $("#roomRT div#poll").gfxPopOut({duration: 100}, function() {
            $("#roomRT #feedback").gfxPopIn({duration: 200, easing: 'ease-out'});
        });
    });

    $("#roomRT .tabs a.poll").live('tap', function() {
        $("#roomRT .tabs a").removeClass("current");
        $(this).addClass("current");
        $("#roomRT #feedback").gfxPopOut({duration: 100}, function() {
            $("#roomRT div#poll").gfxPopIn({duration: 200, easing: 'ease-out'});
        });
    });


    // quit handling
    $("#events").bind('pageAnimationEnd', function(e, info) {
        if (info.direction === 'in') {
            // we are going to events page, we make sure se reset current event
            if (voxxr.chosenEvent()) {
                console.log("quitting event ", voxxr.chosenEvent().title());
                voxxr.chosenEvent().quit();
                voxxr.chosenEvent(null);
            }
        }
    });
    $("#event, #nowplaying").bind('pageAnimationEnd', function(e, info) {
        if (info.direction === 'in') {
            if (voxxr.chosenPresentation()) {
                console.log("quitting presentation ", voxxr.chosenPresentation().title());
                voxxr.chosenPresentation().quit();
                voxxr.chosenPresentation(null);
            }
            if (voxxr.chosenDay()) {
                console.log("quitting day ", voxxr.chosenDay().name());
                voxxr.chosenDay().quit();
                voxxr.chosenDay(null);
            }
            console.log("start autorefeshing event ", voxxr.chosenEvent().title());
            voxxr.chosenEvent().autorefresh(true);
        }
    }).bind('pageAnimationStart', function(e, info) {
        if (info.direction === 'out') {
            console.log("stop autorefeshing event ", voxxr.chosenEvent().title());
            voxxr.chosenEvent().autorefresh(false);
        }
    });

    $("#dayschedule").bind('pageAnimationEnd', function(e, info) {
        if (info.direction === 'in') {
            if (voxxr.chosenPresentation()) {
                console.log("quitting presentation ", voxxr.chosenPresentation().title());
                voxxr.chosenPresentation().quit();
                voxxr.chosenPresentation(null);
            }
        }
    });
    $("#presentation, #presentationDetails").bind('pageAnimationEnd', function(e, info) {
        if (info.direction === 'in') {
            if (voxxr.currentRoom()) {
                voxxr.currentRoom().quit();
                voxxr.currentRoom(null);
            }
        }
    });

});
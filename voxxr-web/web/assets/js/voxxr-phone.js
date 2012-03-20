

$(function() {

    function VoxxrViewModel() {
        var self = this;
        self.events = ko.observableArray([]);
        self.events.loading = ko.observable(false);
        self.chosenEvent = models.Event.current;
        self.chosenEventId = ko.observable(null);
        self.chosenDay = models.ScheduleDay.current;
        self.chosenDayId = ko.observable(null);
        self.chosenPresentation = models.Presentation.current;
        self.chosenPresentationId = ko.observable(null);
        self.currentRoom = models.Room.current;
        self.user = models.User.current;
        self.device = models.Device.current;

        self.chosenEventId.subscribe(onChosenEvent);

        self.chosenDayId.subscribe(onChosenDay);
        self.chosenEventId.subscribe(onChosenDay);

        self.chosenPresentationId.subscribe(onChosenPresentation);
        self.chosenEventId.subscribe(onChosenPresentation);

        function syncById(chosenId, chosenObj, findById) {
            var old = chosenObj();
            findById(chosenId(), function(newObj) {
                if (!newObj || old.id() !== newObj.id()) {
                    chosenObj(newObj);
                }
            });
        }
        function findByIdIn(all, id, callback) {
            var found = id ? _(all).find(function(obj) { return obj.id() === id}) : null;
            callback(found);
        }

        function onChosenEvent() {
            syncById(self.chosenEventId, self.chosenEvent, function(id, callback) {
                if (!id) {
                  callback(null);
                } else {
                    if (self.events().length) {
                        findByIdIn(self.events(), id, callback);
                    } else {
                        var e = ds.event({id: id});
                        if (e.title()) {
                            callback(e);
                        } else {
                            e.load(null, callback);
                        }
                    }
                }
            });
        }

        function onChosenDay() {
            syncById(self.chosenDayId, self.chosenDay, function(id, callback) {
                if (!id) {
                  callback(null);
                } else {
                    if (self.chosenEvent().days().length) {
                        findByIdIn(self.chosenEvent().days(), id, callback);
                    } else if (self.chosenEventId()) {
                        var e = ds.scheduleDay({id: id, eventId: self.chosenEventId()});
                        if (e.name()) {
                            callback(e);
                        } else {
                            e.load(null, callback);
                        }
                    } else {
                        callback(null);
                    }
                }
                findByIdIn(self.chosenEvent().days(), id, callback);
            });
        }

        function onChosenPresentation() {
            syncById(self.chosenPresentationId, self.chosenPresentation, function(id, callback) {
                if (!id) {
                  callback(null);
                } else {
                    if (self.chosenEventId()) {
                        var p = ds.presentation({id: id, eventId:self.chosenEventId()});
                        if (p.title()) {
                            // presentation header is already loaded, we can call the callback with it
                            callback(p);
                            // and ask it to do the full load when possible
                            self.chosenPresentation().load();
                        } else {
                            // presentation header is not loaded yet, no need to call callback until we get it
                            p.load(null, callback);
                        }
                    } else {
                        callback(null);
                    }
                }
            });
        }

        self.chosen = function(options) {
            _(['chosenEventId', 'chosenDayId', 'chosenPresentationId']).each(function (k) {
                if (options[k] != self[k]()) {
                    console.log('changing chosen id for ' + k + ': ' + self[k]() + '=>' + options[k]);
                    self[k](options[k]);
                }
            });
            self.currentRoom(null);
        };

        // load
        self.events.loading(true);
        getJSON("/events", function(data) {
            self.events.loading(false);
            self.events(_(data).map(function(event) { return ds.event(event); }));
            onChosenEvent();
        });
    };

    var voxxr = new VoxxrViewModel();
    ko.applyBindings(voxxr);

    Route
        .add('#events', function() {voxxr.chosen({})}, [])
        .add('#event~:event', function() { voxxr.chosen({chosenEventId: this.params.event}); }, ["#events"])
        .add('#nowplaying~:event', function() { voxxr.chosen({chosenEventId: this.params.event}); }, ["#events", "#event~:event"])
        .add('#dayschedule~:event~:day', function() { voxxr.chosen({chosenEventId: this.params.event, chosenDayId: this.params.day}); }, ["#events", "#event~:event"])
        .add('#presentation~:event~:presentation', function() {
            var options = {chosenEventId: this.params.event, chosenPresentationId: this.params.presentation};
            if (voxxr.chosenDayId()) {
                options.chosenDayId = voxxr.chosenDayId();
            }
            voxxr.chosen(options);
        }, ["#events", "#event~:event"])
        .add('#roomRT', function() { if (!models.Room.current()) setTimeout(function() {location.hash = '#events'}, 0); })
        .add('', function() {voxxr.chosen({})}, [])
        .start();

    var hfpoints = [];
    var rpoints = [];
    for (var i=0 ; i < 200 ; i++) {
        hfpoints[i] = rpoints[i] = null;
    }
    var pindex = 0;
    var hfsparkoptions = { width: 260, height: 50, defaultPixelsPerValue: 1, lineColor: '#C44D58', fillColor: '#FBD405', spotColor: false}
    var ratesparkoptions = { lineColor: '#556270', fillColor: false, composite: true, spotColor: false}
    $("#roomRT .spark").sparkline(hfpoints, hfsparkoptions);
    models.Room.onEV(function(f) {
        if (f.isPollStart) {
            navigator.notification.vibrate(1000);
            $("#roomRT .tabs a.poll .ui-btn-text").text('< POLL >');
            $("#roomRT .tabs a.poll").gfxShake({distance: 5, duration: 100});
            $("#roomRT .tabs a.poll .ui-icon").highlight();
        }
        if (f.isPollEnd) {
            $("#roomRT .tabs a.poll .ui-btn-text").text('POLL')
                .gfxShake({distance: 20, duration: 500});
        }
        if (f.isPoke && f.toUser === models.User.current().name()) {
            navigator.notification.vibrate(2000);
            navigator.notification.alert(
                f.msg,  // message
                'Poked by ' + f.user,            // title
                'Ok'                  // buttonName
            );
        }
        if (f.isHotFactor) {
            hfpoints[pindex] = Math.round(Math.log(f.hotFactorValue) * 1000);
            rpoints[pindex] = voxxr.chosenPresentation().rate.avg();
            pindex++;
            if (pindex == 200) {
                pindex = 199;
                hfpoints.splice(0,1);
                hfpoints.push(null);
                rpoints.splice(0,1);
                rpoints.push(null);
            }
            $("#roomRT .spark").sparkline(hfpoints, hfsparkoptions);
            $("#roomRT .spark").sparkline(rpoints, ratesparkoptions);
        }
    });


    (function() {
        var myRate = {avg: 0, last: 0};

        $("#feedback .rate .star").live('tap', function() {
            vote($(this).attr('data-rate'));
            return false;
        });

        function sendEV(ev, onsuccess, onerror) {
            voxxr.currentRoom().sendEV(ev, onsuccess, onerror);
        }

        function setVotes(rate, style) {
            rate = rate === 0 ? 0 : (rate || myRate.last);
            style = style || 'vote';
            for (var i = 1; i <= 5; i++) {
                var v = $("#feedback .rate").find('[data-rate="' + i + '"]');
                v.removeClass('vote').removeClass('voting');
                if (i<=rate) {
                    v.addClass(style);
                }
            }
        }

        var voteFadeOutTimeout = null;
        function vote(r) {
            if (voteFadeOutTimeout) {
                clearTimeout(voteFadeOutTimeout);
                voteFadeOutTimeout = null;
            }
            setVotes(r, 'voting');
            sendEV("R" + r,
                function() {
                    myRate.last = r; setVotes();
                    voteFadeOutTimeout = setTimeout(function() { setVotes(0); }, 4000);
                }, function() {
                    setVotes(0);
                });
        }

        $("#feedback .feeling a").live('tap', function() {
            feeling($(this).attr('data-value'));
        });

        function feeling(r) {
            sendEV("F" + r, function() {
                $("#feedback .feeling a[data-value='" + r + "']").gfxFlipIn({});
            });
        }

        $("#roomRT #poll ul li a").live('tap', function() {
            var r = $(this).attr('data-value');
            sendEV("PV" + r, function() {
                $("#roomRT #poll ul li a").removeClass("current");
                $("#roomRT #poll ul li a[data-value='" + r + "']").addClass("current");
            });
        });
    })();

    // tabs handling
    $("#roomRT .tabs a.rate").bind('vclick', function() {
        $("#roomRT .tabs a").removeClass("ui-btn-active");
        $(this).addClass("ui-btn-active");
        $("#roomRT div#poll").hide();
        $("#roomRT #feedback").show();
    });

    $("#roomRT .tabs a.poll").bind('vclick', function() {
        $("#roomRT .tabs a").removeClass("ui-btn-active");
        $(this).addClass("ui-btn-active");
        $("#roomRT #feedback").hide();
        $("#roomRT div#poll").show();
    });


    $("#roomRT a.quit").bind('vclick', function() {
        models.Room.current().leave();
    });
    $("#roomRT a.reconnect").bind('vclick', function() {
        models.Room.current().reconnect();
        return false;
    }).mousedown(function() {
        $(this).toggleClass('ui-btn-up-e').toggleClass('ui-btn-down-e');
    }).mouseup(function() {
        $(this).toggleClass('ui-btn-up-e').toggleClass('ui-btn-down-e');
    });
     $("#nowplaying a.refresh").bind('vclick', function() {
        models.Event.current().refreshNowPlaying();
    }).mousedown(function() {
        $(this).toggleClass('ui-btn-up-e').toggleClass('ui-btn-down-e');
    }).mouseup(function() {
        $(this).toggleClass('ui-btn-up-e').toggleClass('ui-btn-down-e');
    });
    $("#presentation a.joinroom").bind('vclick', function() {
        models.Presentation.current().room().join();
    }).mousedown(function() {
        $(this).toggleClass('ui-btn-up-e').toggleClass('ui-btn-down-e');
    }).mouseup(function() {
        $(this).toggleClass('ui-btn-up-e').toggleClass('ui-btn-down-e');
    });
});
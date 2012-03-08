

$(function() {

    function VoxxrViewModel() {
        var self = this;
        self.events = ko.observableArray([]);
        self.events.loading = ko.observable(false);
        self.chosenEvent = models.Event.current;
        self.chosenEventId = ko.observable(null);
        self.chosenDay = models.ScheduleDay.current;
        self.chosenDayId = ko.observable(null);
        self.chosenPresentation = ko.observable(null);
        self.chosenPresentationId = ko.observable(null);
        self.currentRoom = models.Room.current;
        self.user = models.User.current;
        self.device = models.Device.current;

        self.chosenEventId.subscribe(onChosenEvent);

        self.chosenDayId.subscribe(onChosenDay);
        self.chosenEvent.subscribe(onChosenDay);

        self.chosenPresentationId.subscribe(onChosenPresentation);
        self.chosenEvent.subscribe(onChosenPresentation);

        function syncById(chosenId, chosenObj, findById) {
            var old = chosenObj();
            findById(chosenId(), function(newObj) {
                if (old !== newObj) {
                    chosenObj(newObj);
                    if (old) {
                        console.log('quitting ' + old.hash())
                        old.quit();
                    }
                    if (newObj) {
                        console.log('entering ' + newObj.hash())
                        newObj.enter();
                    }
                }
            });
        }
        function findByIdIn(all, id, callback) {
            var found = id ? _(all).find(function(obj) { return obj.id() === id}) : null;
            callback(found);
        }

        function onChosenEvent() {
            syncById(self.chosenEventId, self.chosenEvent, function(id, callback) {findByIdIn(self.events(), id, callback);});
        }

        function onChosenDay() {
            syncById(self.chosenDayId, self.chosenDay, function(id, callback) {
                findByIdIn(self.chosenEvent() ? self.chosenEvent().days() : [], id, callback);
            });
        }

        function onChosenPresentation() {
            syncById(self.chosenPresentationId, self.chosenPresentation, function(id, callback) {
                if (!id) {
                  callback(null);
                } else {
                    if (self.chosenEventId()) {
                        ds.presentation({id: id, eventId:self.chosenEventId()}).load(null, callback);
                    } else {
                        callback(null);
                    }
                }
            });
        }

        self.chosen = function(options) {
            self.chosenEventId(options['chosenEventId']);
            self.chosenDayId(options['chosenDayId']);
            self.chosenPresentationId(options['chosenPresentationId']);
        };

        // change current selection function
        self.selectPresentation = function(presentation) {
            presentation.load();
            self.chosenPresentation(presentation);
        };

        // load
        self.events.loading(true);
        $.getJSON(models.baseUrl + "/events", function(data) {
            self.events.loading(false);
            self.events(_(data).map(function(event) { return ds.event(event); }));
            onChosenEvent();
        });
    };

    var voxxr = new VoxxrViewModel();
    ko.applyBindings(voxxr);

    Route
        .add('#events', function() {}, [])
        .add('#event/:event', function() { voxxr.chosen({chosenEventId: this.params.event}); }, ["#events"])
        .add('#nowplaying/:event', function() { voxxr.chosen({chosenEventId: this.params.event}); }, ["#events", "#event/:event"])
        .add('#dayschedule/:event/:day', function() { voxxr.chosen({chosenEventId: this.params.event, chosenDayId: this.params.day}); }, ["#events", "#event/:event"])
        .add('#presentation/:event/:presentation', function() {
            var options = {chosenEventId: this.params.event, chosenPresentationId: this.params.presentation};
            if (voxxr.chosenDayId()) {
                options.chosenDayId = voxxr.chosenDayId();
            }
            voxxr.chosen(options);
        }, ["#events", "#event/:event"])
        .add('#roomRT', function() { if (!models.Room.current()) setTimeout(function() {location.hash = '#events'}, 0); })
        .start();

    models.Room.onEV(function(f) {
        if (f.isPollStart) {
            navigator.notification.vibrate(1000);
            $("#roomRT .tabs a.poll").text('< POLL >')
                .gfxShake({distance: 20, duration: 100});
        }
        if (f.isPollEnd) {
            $("#roomRT .tabs a.poll").text('POLL')
                .gfxShake({distance: 20, duration: 100});
        }
        if (f.isPoke && f.toUser === models.User.current().name()) {
            navigator.notification.vibrate(2000);
            navigator.notification.alert(
                f.msg,  // message
                'Poked by ' + f.user,            // title
                'Ok'                  // buttonName
            );
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
            sendEV("R" + r, function() { myRate.last = r; setVotes();}, function() { setVotes(); });
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
            if (voxxr.chosenEventId()) {
                voxxr.chosenEventId(null);
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
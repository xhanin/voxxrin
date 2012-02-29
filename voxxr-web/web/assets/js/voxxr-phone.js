
var jQT = new $.jQTouch({
    statusBar: 'black'
});

$(function() {

    models.baseUrl = "http://localhost:8080/r";
//    models.baseUrl = "http://2.latest.voxxr-web.appspot.com/r";
//    models.baseUrl = "http://voxxr-web.appspot.com/r";

    function VoxxrViewModel() {
        var self = this;
        self.events = ko.observableArray([]);
        self.events.loading = ko.observable(false);
        self.chosenEvent = ko.observable(null);
        self.chosenDay = ko.observable(null);
        self.chosenPresentation = ko.observable(null);
        self.currentRoom = models.Room.current;
        self.user = ko.observable({ name: ko.observable("anonymous") });

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
        $.getJSON(models.baseUrl + "/events", function(data) {
            self.events.loading(false);
            self.events(_(data).map(function(event) { return ds.event(event); }));
        });
    };

    var voxxr = new VoxxrViewModel();
    ko.applyBindings(voxxr);

    models.Room.onEV(function(f) {
        if (f.isPollStart) {
            $("#roomRT .tabs a.poll").text('< POLL >')
                .gfxShake({distance: 20, duration: 100});
        }
        if (f.isPollEnd) {
            $("#roomRT .tabs a.poll").text('POLL')
                .gfxShake({distance: 20, duration: 100});
        }
    });

    function sendFeedback(f, onsuccess, onerror) {
        console.debug('--------------  FEEDBACK ', f, ' ON ', voxxr.currentRoom().rt(), "/r/feedback");
        $.ajax({
            type: "POST",
            url: voxxr.currentRoom().rt() + "/r/feedback",
            data: models.EV.toBC(voxxr.user().name(), f),
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
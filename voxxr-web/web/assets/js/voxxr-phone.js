var jQT = new $.jQTouch({
    statusBar: 'black'
});

$(function() {

    var baseUrl = "http://localhost:8080/r"; // "http://voxxr-web.appspot.com/r";

    function Room(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.name = ko.observable(data.name);
    }

    function Talk(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.title = ko.observable(data.title);
        self.speakers = ko.observableArray(data.speakers);
        self.start = ko.observable(data.start);
        self.room = ko.observable(new Room(data.room));

        self.speakerNames = ko.computed(function() {
            return ko.toJS(this.speakers).join(', ');
        }, self);
    }

    function Event(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.title = ko.observable(data.title);
        self.subtitle = ko.observable(data.subtitle);
        self.nbTalks = ko.observable(data.nbTalks);
        self.dates = ko.observable(data.dates);
        self.nowplaying = ko.observableArray([]);

//        $.getJSON(baseUrl + "/events/" + id() + "/nowplaying", function(data) {
        // TODO: we shoudn't trigger that right now, but only when we want to access event detail (enter event)
        $.getJSON(baseUrl + "/events/nowplaying/" + self.id(), function(data) {
            self.nowplaying(_(data).map(function(talk) { return new Talk(talk); }));
        });
    }

    function VoxxrViewModel() {
        var self = this;
        self.events = ko.observableArray([]);
        self.chosenEvent = ko.observable(null);

        $.getJSON(baseUrl + "/events", function(data) {
            self.events(_(data).map(function(event) { return new Event(event); }));
        });
    };

    var voxxr = new VoxxrViewModel();

    (function(){
        ko.applyBindings(voxxr);
    })();

    (function(){
        function displayEvents(events) {
            var eventsLis = '';
            _(events).each(function(event){
                eventsLis +=
                    '<li class="arrow"><a href="#event" class="event">' +
                        '<small>' + event.nbTalks + ' talks</small> ' +
                        event.title + ' ' +
                        '<em>' + (event.subtitle ? event.subtitle + ' ~ ' : '') + event.dates + '</em>' +
                    '</a></li>';
            });
            $("#events ul.events").html(eventsLis);
        }

        function loadEvents() {
            $.ajax({
                url: baseUrl + "/events",
                type: 'GET',
                dataType: 'json',
                success: function(events) {
                    voxxr.events = events;
                    displayEvents(voxxr.events);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log(jqXHR, textStatus, errorThrown);
                }
            });
        }

        $("#events ul.events").empty();
        loadEvents();
    });


    (function(){
        function displayEvent(event) {
            var page = $("#event");
            page.find('.title').text(event.title);
            page.find('.schedule .counter').text(event.nbTalks);
            page.find('.nowplaying .counter').text(event.nowplaying ? event.nowplaying.length : '');
        }

        function loadEventNowPlaying(event) {
            $.ajax({
                url: baseUrl + "/events/" + event.id + "/nowplaying",
                type: 'GET',
                dataType: 'json',
                success: function(nowplaying) {
                    event.nowplaying = nowplaying;
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log(jqXHR, textStatus, errorThrown);
                }
            });
        }

    });
//    var room = "1",
//        baseRoomUrl = "http://r" + room + ".voxxr.in:8076/r";

    var transport = "long-polling";
    if ('WebSocket' in window) {
        transport = "websocket";
    }


    function joinRoom(room, baseRoomUrl) {
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
                feedback.room = room;
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

        (function() {
            // FEEDBACK

            var feedbackPnl = $("#feedback");

            // FEEDBACK.RATE
            var ratePnl = feedbackPnl.find(".rate");
            var myRate = {avg: 0, last: 0};

            var stars = ratePnl.find(".star");

            stars.tap(function() {
                vote($(this).attr('data-rate'));
                return false;
            });

            function setVotes(rate, style) {
                rate = rate || myRate.last;
                style = style || 'vote';
                for (var i = 1; i <= 5; i++) {
                    var v = ratePnl.find('[data-rate="' + i + '"]');
                    v.removeClass('vote').removeClass('voting');
                    if (i<=rate) {
                        v.addClass(style);
                    }
                }

            }

            function vote(r) {
                setVotes(r, 'voting');
                console.debug('-------------- VOTING ', r, ' ON ', baseRoomUrl, "/feedback");
                $.ajax({
                    type: "POST",
                    url: baseRoomUrl + "/feedback",
                    data: feedback(user, "R" + r),
                    dataType:"json",
                    success: function( resp ) {
                        if (resp.status === 'ok') {
                            console.debug('-------------- VOTE SUCCESS ', r);
                            myRate.last = r;
                            setVotes();
                        }
                    },
                    error: function(xhr, type) {
                        console.error('-------------- VOTE ERROR' + xhr);
                        setVotes();
                    }
                });
            }

            var feelingPanel = feedbackPnl.find('.feeling');
            feelingPanel.find('a').tap(function() {
                feeling($(this).attr('data-value'));
            });

            function feeling(r) {
                console.debug('-------------- FEELING ', r, ' ON ', baseRoomUrl, "/feedback");
                $.ajax({
                    type: "POST",
                    url: baseRoomUrl + "/feedback",
                    data: feedback(user, "F" + r),
                    dataType:"json",
                    success: function( resp ) {
                        if (resp.status === 'ok') {
                            feelingPanel.find("a[data-value='" + r + "']").gfxFlipIn({});
                        }
                    },
                    error: function(xhr, type) {
                        console.error('-------------- FEELING ERROR' + xhr);
                    }
                });
            }
        })();

        (function() {
            // DASHBOARD
            var rateMean = $("#feedback .dashboard .rateMean");
            var connections = $("#feedback .dashboard .connections");

            var rate =  {
                nb: 0,
                avg: 0
            }

            function subscribe() {
                console.info('-------------- SUBSCRIBING TO ', baseRoomUrl, '/room/rt', ' with transport ', transport);
                $.atmosphere.subscribe(
                    baseRoomUrl + '/room/rt',
                    function(response) {
                        if (response.state == 'error' || response.state == 'closed') {
                            $("#roomRT .message").text("Room connection lost").show();
                            $("#roomRT div.reconnect").show();
                            $("#roomRT .content").hide();
                            return;
                        }
                        if (response.transport != 'polling'
                            && response.state != 'connected' && response.state != 'closed') {
                            if (response.status == 200) {
                                var data = response.responseBody;
                                if (data.length > 0) {
                                    var f = parseFeedback(data);

                                    if (f.isConnection) {
                                        connections.text(f.connections);
                                    }
                                    if (f.isTitle) {
                                        $("#roomRT h1").text(f.title);
                                    }
                                    if (f.isPollStart) {
                                        $("#roomRT #poll .nopoll").hide();
                                        var p = ''
                                        $(f.items).each(function(i) {
                                            p += '<li><a href="#" data-value="' + i + '">' + this + '</a></li>'
                                        });
                                        $("#roomRT #poll ul").html(p).show();
                                        $("#roomRT #poll ul li a").tap(function() {
                                            voteForPoll($(this).attr('data-value'));
                                        });
                                        $("#roomRT .tabs a.poll").text('< POLL >')
                                            .gfxShake({distance: 20, duration: 100});
                                    }
                                    if (f.isPollEnd) {
                                        $("#roomRT #poll .nopoll").show();
                                        $("#roomRT #poll ul").hide();
                                        $("#roomRT .tabs a.poll").text('POLL')
                                            .gfxShake({distance: 20, duration: 100});
                                    }
                                    if (f.isRate) {
                                        rate.avg = ((rate.avg * rate.nb) + (f.rateValue * 100)) / (rate.nb + 1);
                                        rate.nb++;

                                        rateMean.text((rate.avg / 100).toFixed(2));
                                    }

                                }
                            }
                        }
                    },
                    $.atmosphere.request = { transport: transport });
            }

            var connect = function() {
                $("#roomRT div.reconnect").hide();
                $("#roomRT .message").text("Connecting to room...").show();
                $.ajax({
                    type: "GET",
                    url: baseRoomUrl + "/room",
                    dataType:"json",
                    success: function(resp) {
                        if (resp.status === 'ok') {
                            $("#roomRT h1").text(resp.title);
                            $("#feedback .dashboard .connections").text(resp.connections);
                            rate.nb = resp.ratings;
                            rate.avg = resp.rate * 100;
                            rateMean.text((rate.avg / 100).toFixed(2));

                            $("#roomRT .message").hide();
                            $("#roomRT .content").show();
                            $("#roomRT div.reconnect").show();
                            subscribe();
                        } else {
                            $("#roomRT .message").text(resp.message).show();
                            $("#roomRT div.reconnect").show();
                        }
                    },
                    error: function(xhr, type) {
                        console.error('-------------- CONNECTION ERROR', xhr);
                        $("#roomRT .message").text("Can't connect to room. Is it currently opened?").show();
                        $("#roomRT div.reconnect").show();
                    }
                });
            };
            connect();

            function voteForPoll(r) {
                console.debug('-------------- VOTING FOR POLL ', r, ' ON ', baseRoomUrl, "/feedback");
                $.ajax({
                    type: "POST",
                    url: baseRoomUrl + "/feedback",
                    data: feedback(user, "PV" + r),
                    dataType:"json",
                    success: function( resp ) {
                        if (resp.status === 'ok') {
                            $("#roomRT #poll ul li a").removeClass("current");
                            $("#roomRT #poll ul li a[data-value='" + r + "']").addClass("current");
                        }
                    },
                    error: function(xhr, type) {
                        console.error('-------------- POLL VOTE ERROR' + xhr);
                    }
                });
            }

            $("#roomRT a.reconnect").tap(function() {
                $.atmosphere.closeSuspendedConnection();
                connect();
            });


            $("#roomRT .tabs a.rate").tap(function() {
                $("#roomRT .tabs a").removeClass("current");
                $(this).addClass("current");
                $("#roomRT div#poll").gfxPopOut({duration: 100}, function() {
                    $("#roomRT #feedback").gfxPopIn({duration: 200, easing: 'ease-out'});
                });
            });

            $("#roomRT .tabs a.poll").tap(function() {
                $("#roomRT .tabs a").removeClass("current");
                $(this).addClass("current");
                $("#roomRT #feedback").gfxPopOut({duration: 100}, function() {
                    $("#roomRT div#poll").gfxPopIn({duration: 200, easing: 'ease-out'});
                });
            });


        })();
    }

});
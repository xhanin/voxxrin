$(function() { models.Device.current().whenReady(function() {
    function VoxxrViewModel() {
        var self = this;
        self.events = ko.observableArray([]);
        self.events.loading = ko.observable(false);
        self.chosenEvent = models.Event.current;
        self.chosenEventId = ko.observable(null);
        self.chosenDay = models.ScheduleDay.current;
        self.chosenDayId = ko.observable(null);
        self.showPastEvents = ko.observable(false);
        self.chosenPresentation = models.Presentation.current;
        self.chosenPresentationId = ko.observable(null);
        self.currentRoom = models.Room.current;
        self.user = models.User.current;
        self.device = models.Device.current;
        self.showableEvents = ko.computed(function() {
            var events = self.events();
            var showPastEvents = self.showPastEvents();
            var filteredEvents = _.filter(events, function(ev) {
                return showPastEvents || parseDateFromStr(ev.to()) > new Date().getTime();
            });
            if(showPastEvents) {
                filteredEvents = filteredEvents.reverse();
            }
            return filteredEvents;
        });
        self.loginBtn = ko.computed(function() {
            var u = self.user();
            return (u && u.id()) || 'Login';
        });

        var eventsBound = false;
        self.gotoEvents = function() {
            if (!eventsBound) {
                $.mobile.enhancePage($('#events'));
                ko.applyBindings(self, $('#events').get(0));
                eventsBound = true;
            }

            self.chosenEvent(null);
            self.chosenDay(null);
            self.chosenPresentation(null);
            self.currentRoom(null);
            return $('#events');
        }

        self.pageTemplates = {};
        self.goto = function(pageTplId, objOrObjType, objRef) {
            var obj = typeof objOrObjType === "string" ? ds[objOrObjType](objRef) : objOrObjType;
            obj.page = obj.page || {};
            if (!obj.page[pageTplId]) {
                if (!self.pageTemplates[pageTplId]) {
                    console.log('detaching template ' + pageTplId);
                    self.pageTemplates[pageTplId] = $('#' + pageTplId).detach();
                }
                console.log('creating page ' + pageTplId + '-' + obj.id());
                var page = obj.page[pageTplId] = self.pageTemplates[pageTplId].clone();
                page.attr('id', pageTplId + '-' + obj.id());
                $('#jqt').append(page);
                console.log('enhancing page ' + pageTplId + '-' + obj.id());
                $.mobile.enhancePage(page);
                console.log('binding page ' + pageTplId + '-' + obj.id());
                ko.applyBindings(obj, page.get(0));
                console.log('DONE creating page ' + pageTplId + '-' + obj.id());
            } else {
                console.log('reusing page ' + pageTplId + '-' + obj.id());
            }
            return obj;
        }

        self.gotoEvent = function(id) {
            var event = self.goto('event', 'event', {id: id});
            self.chosenEvent(event);
            self.chosenDay(null);
            self.chosenPresentation(null);
            self.currentRoom(null);
            return event.page.event;
        };

        self.gotoNowPlaying = function(id) {
            var event = self.goto('nowplaying', 'event', {id: id});
            self.chosenEvent(event);
            self.chosenDay(null);
            self.chosenPresentation(null);
            self.currentRoom(null);
            return event.page.nowplaying;
        };

        self.gotoDay = function(eventId, dayId) {
            var day = self.goto('dayschedule', 'scheduleDay', {id: dayId, eventId: eventId});
            self.chosenDay(day);
            self.chosenPresentation(null);
            self.currentRoom(null);
            return day.page.dayschedule;
        };

        self.gotoPresentation = function(eventId, presentationId) {
            var p = self.goto('presentation', 'presentation', {id: presentationId, eventId: eventId});
            self.chosenPresentation(p);
            self.currentRoom(null);
            return p.page.presentation;
        };

        self.gotoRoom = function() {
            var room = self.goto('roomRT', self.currentRoom());
            return room.page.roomRT;
        };

        self.load = function() {
//            $.mobile.enhancePage($('#twitterSignin'));
            self.events.loading(true);
            getJSON("/events", function(data) {
                self.events.loading(false);
                self.events(_(data).map(function(event) { return ds.event(event); }));
            });
        };
    };

    var voxxr = new VoxxrViewModel();
    voxxr.load();
    Route
        .add('!events', function() {
            return voxxr.gotoEvents();
        }, [])
        .add('!event~:event', function() {
            return voxxr.gotoEvent(this.params.event);
        }, ["index#!events"])
        .add('!nowplaying~:event', function() {
            return voxxr.gotoNowPlaying(this.params.event);
        }, ["index#!events", "index#!event~:event"])
        .add('!dayschedule~:event~:day', function() {
            return voxxr.gotoDay(this.params.event, this.params.day);
        }, ["index#!events", "index#!event~:event"])
        .add('!presentation~:event~:presentation', function() {
            return voxxr.gotoPresentation(this.params.event, this.params.presentation);
        }, ["index#!events", "index#!event~:event"])
        .add('!roomRT', function() {
            if (!models.Room.current()) setTimeout(function() {location.hash = '#!events'}, 0);
            return voxxr.gotoRoom();
        })
        .add('', function() {
            return voxxr.gotoEvents();
        }, [])
        .start('!events');

    ko.applyBindings(voxxr.user(), $('#signin').get(0));

    models.Room.onEV(function(f) {
        if (f.isPollStart) {
            navigator.notification.vibrate(1000);
            $(".roomRT.page .tabs a.poll .ui-btn-text").text('< POLL >');
            $(".roomRT.page .tabs a.poll").gfxShake({distance: 5, duration: 100});
            $(".roomRT.page .tabs a.poll .ui-icon").highlight();
        }
        if (f.isPollEnd) {
            $(".roomRT.page .tabs a.poll .ui-btn-text").text('POLL')
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
    });


    (function() {
        var myRate = {avg: 0, last: 0};

        tappable("#feedback .rate .star", function(e, target) {
            vote($(target).closest(".roomRT.page"), $(target).attr('data-rate'));
            return false;
        });

        function sendEV(ev, onsuccess, onerror) {
            voxxr.currentRoom().sendEV(ev, onsuccess, onerror);
        }

        function setVotes(roomRT, rate, style) {
            rate = rate === 0 ? 0 : (rate || myRate.last);
            style = style || 'vote';
            for (var i = 1; i <= 5; i++) {
                var v = roomRT.find("#feedback .rate").find('[data-rate="' + i + '"]');
                v.removeClass('vote').removeClass('voting');
                if (i<=rate) {
                    v.addClass(style);
                }
            }
        }

        var voteFadeOutTimeout = null;
        function vote(roomRT, r) {
            if (voteFadeOutTimeout) {
                clearTimeout(voteFadeOutTimeout);
                voteFadeOutTimeout = null;
            }
            setVotes(roomRT, r, 'voting');
            sendEV("R" + r,
                function() {
                    myRate.last = r; setVotes(roomRT);
                    voteFadeOutTimeout = setTimeout(function() { setVotes(roomRT, 0); }, 4000);
                }, function() {
                    setVotes(roomRT, 0);
                });
        }

        tappable("#feedback .feeling a", function(e, target) {
            $(target).addClass('sending');
            setTimeout(function() {$(target).removeClass('sending')}, 200);
            feeling($(target).closest(".roomRT.page"), $(target).attr('data-value'));
        });

        function feeling(roomRT, r) {
            sendEV("F" + r, function(data) {
                var btn = roomRT.find("#feedback .feeling a[data-value='" + r + "']");
                if (data.status === 'ok') { btn.gfxFlipIn({}) }
                btn.removeClass('sending');
            });
        }

        tappable(".roomRT.page #poll ul li a", function(e, target) {
            var r = $(target).attr('data-value');
            sendEV("PV" + r, function() {
                var roomRT = $(target).closest(".roomRT.page");
                roomRT.find("#poll ul li a").removeClass("current");
                roomRT.find("#poll ul li a[data-value='" + r + "']").addClass("current");
            });
        });
    })();

    // tabs handling
    tappable(".roomRT.page .tabs a.rate", function(e, target) {
        var roomRT = $(target).closest(".roomRT.page");
        roomRT.find(".tabs a").removeClass("ui-btn-active");
        $(target).addClass("ui-btn-active");
        roomRT.find("div#poll").hide();
        roomRT.find("div.network").hide();
        roomRT.find("#feedback").show();
    });

    tappable(".roomRT.page .tabs a.poll", function(e, target) {
        var roomRT = $(target).closest(".roomRT.page");
        roomRT.find(".tabs a").removeClass("ui-btn-active");
        $(target).addClass("ui-btn-active");
        roomRT.find("#feedback").hide();
        roomRT.find("div.network").hide();
        roomRT.find("div#poll").show();
    });

    tappable(".roomRT.page .tabs a.network", function(e, target) {
        // refresh presentation stats
        models.Presentation.current().loadStats();
        
        var roomRT = $(target).closest(".roomRT.page");
        roomRT.find(".tabs a").removeClass("ui-btn-active");
        $(target).addClass("ui-btn-active");
        roomRT.find("#feedback").hide();
        roomRT.find("div#poll").hide();
        roomRT.find("div.network").show();
    });


    tappable(".roomRT.page a.quit", function() {
        models.Room.current().leave();
    });
    tappable(".roomRT.page a.reconnect", function() {
        models.Room.current().reconnect();
    });
    tappable(".nowplaying.page a.refresh", function() {
        models.Event.current().refreshNowPlaying();
    });
    tappable(".presentation.page a.showroom", function() {
        models.Presentation.current().room().show();
    });
    tappable("a.joinroom", function() {
        models.Room.current().join();
    });

    tappable(".presentation.page .toggleDetails", function(e, target) {
        var summaryDiv = $(target).closest('.presentation.page').find('div.summary');
        if (summaryDiv.hasClass('allDetails')) {
            summaryDiv.removeClass('allDetails');
            $(target).find('.ui-icon').removeClass('ui-icon-arrow-u').addClass('ui-icon-arrow-d');
        } else {
            summaryDiv.addClass('allDetails');
            $(target).find('.ui-icon').removeClass('ui-icon-arrow-d').addClass('ui-icon-arrow-u');
        }
    });

    tappable(".presentation.page .toggleFavorite", function() {
        var my = voxxr.chosenPresentation().my();
        my.favorite(!my.favorite());
    });

    tappable(".dayschedule.page .slotsNav a.slot", function(e, target) {
        var slot = $(target).attr('data-slot');
        var slotLi = $(target).closest('.dayschedule.page').find('ul.schedule li.slot[data-slot="' + slot + '"]');
        $.mobile.silentScroll( slotLi.offset().top );
    });
    tappable(".dayschedule.page ul.schedule li.slot", function() {
        $.mobile.silentScroll( );
    });

    tappable("li.speaker", {activeClass:'ignored', onTap: function(e, target) {
        $(target).find('p').toggleClass('allDetails');
    }});

    var client_browser = null;
    if (window.plugins && window.plugins.childBrowser) {
        client_browser = window.plugins.childBrowser;
    } else if (typeof ChildBrowser !== 'undefined') {
        client_browser = ChildBrowser.install();
    }
    tappable("a#showPastEvents", function() {
        voxxr.showPastEvents(true);
    });
    tappable("a#showFuturePrez", function() {
        models.ScheduleDay.current().showPastPresentationsOnToday(false);
    });
    tappable("a#showPastPrez", function() {
        models.ScheduleDay.current().showPastPresentationsOnToday(true);
    });
    tappable("a.signin", function() {
        if (client_browser != null) {
            console.log('registering onLocationChange');
            var onLocationChange = function(loc) {
                console.log('locationChanged to ' + loc);
                if (loc.indexOf('/signedin.html') !== -1 || loc.indexOf('/notsignedin.html') !== -1) {
                    client_browser.onLocationChange = null;
                    if (loc.indexOf('/notsignedin.html') !== -1) {
                        models.User.current().authenticationInProgress(false);
                        setTimeout(function() {client_browser.close()}, 3000);
                    } else {
                        client_browser.close();
                        models.User.current().reloadMy();
                    }
                }
            }
            client_browser.onLocationChange = onLocationChange
        } else {
            console.log('no client browser detected ~ web app mode');
        }

        function twitterSignin(deviceId) {
            var url = models.baseUrl + '/twitter/signin?deviceid=' + deviceId;
            if(urlParams['mode'] === 'dev') {
                url += '&mode=dev';
            }
            if (client_browser) {
                console.log('opening child web page ' + url);
                window.plugins.childBrowser.showWebPage(url);
            } else {
                window.location.href = url;
            }
        }

        var deviceId = models.Device.current().id();
        if (!deviceId) {
            console.log('no device id available yet, waiting for it to display signin with twitter');
            var onDeviceId = function(newValue) {
                models.Device.current().id.unsubscribe(onDeviceId);
                twitterSignin(newValue);
            }
            models.Device.current().id.subscribe(onDeviceId);
        } else {
            twitterSignin(deviceId);
        }
        models.User.current().authenticationInProgress(true);
    });
    tappable("a.signout", function() {
       models.User.current().signedOut();
    });
    tappable("a.refreshMy", function() {
       models.User.current().reloadMy();
    });

    tappable("a", function(e, target) {
       $.mobile.handleLink(target);
    });

    // use no transition by default on android ATM, browser is too slow, and this is hard to feature detect.
    var ua = navigator.userAgent;
    $.mobile.defaultPageTransition = (ua.indexOf( "Android" ) > -1) ? 'none' : 'none';

    $.mobile.linkBindingEnabled = false;

    var storedVersion = localStorage.getItem('version');
    if (storedVersion !== models.version) {
        localStorage.setItem('version', models.version);
        if (storedVersion) {
            $.mobile.changePage('#' + models.version);
        } else {
            $.mobile.changePage('#about');
        }
    }
})
});
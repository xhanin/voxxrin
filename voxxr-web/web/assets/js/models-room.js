(function(exports) {

    var Room = function(data) {
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
            Room.current(self);
            self.connect();
        };
        self.leave = function() {
            self.quit();
            jQT.goBack();
        };
        self.quit = function() {
            console.log("quitting room ", self.name());
            self.disconnect();
            Room.current(null);
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
                            subscribe(self);
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

        var transport = "long-polling";
//    if ('WebSocket' in window) {
//        transport = "websocket";
//    }
        function subscribe(room) {
            var $room = room;
            console.info('-------------- SUBSCRIBING TO ', $room.rt(), '/r/room/rt', ' with transport ', transport);
            $.atmosphere.subscribe(
                $room.rt() + '/r/room/rt',
                function(response) {
                    if (response.state == 'error' || response.state == 'closed') {
                        $room.message("Room connection lost");
                        $room.status(models.Room.DISCONNECTED);
                        return;
                    }
                    if (response.transport != 'polling'
                        && response.state != 'connected' && response.state != 'closed') {
                        if (response.status == 200) {
                            var data = response.responseBody;
                            if (data.length > 0) {
                                var ev = exports.models.EV.fromBC(data, $room.id());

                                if (ev.isConnection) {
                                    $room.connections(ev.connections);
                                }
                                var pres = $room.currentPresentation();
                                if (ev.isTitle) {
                                    pres.title(ev.title);
                                }
                                if (ev.isPollStart) {
                                    pres.currentPoll(new models.PresentationPoll({
                                        choices: _(ev.items).map(function(e,i) { return {title: e, index: i}; })
                                    }));
                                }
                                if (ev.isPollEnd) {
                                    pres.currentPoll(null);
                                }
                                if (ev.isRate) {
                                    var rate = pres.rate;
                                    rate.avg(((rate.avg() * rate.nb()) + (ev.rateValue * 100)) / (rate.nb() + 1));
                                    rate.nb(rate.nb() + 1);
                                }
                                if (ev.isHotFactor) {
                                    pres.hotFactor(ev.hotFactorValue);
                                }
                                if (ev.isPrezStart) {
                                    pres.start();
                                }
                                if (ev.isPrezEnd) {
                                    pres.stop();
                                }

                                $("body").trigger('EV', ev);
                            }
                        }
                    }
                },
                $.atmosphere.request = { transport: transport, maxRequest : 100000 });
        }

        self.sendEV = function(ev, onsuccess, onerror) {
            if (!self.rt()) {
                console.error('-------------- EV ERROR: cannot send EV when not connected');
                onerror();
                return;
            }
            console.debug('--------------  EV ', ev, ' ON ', self.rt(), "/r/feedback");
            $.ajax({
                type: "POST",
                url: self.rt() + "/r/feedback",
                data: models.EV.toBC(models.User.current().name(), ev),
                dataType:"json",
                success: function( resp ) {
                    if (resp.status === 'ok') {
                        console.debug('-------------- EV SUCCESS ', ev);
                        if (onsuccess) onsuccess(resp);
                    }
                },
                error: function(xhr, type) {
                    console.error('-------------- EV ERROR' + xhr);
                    if (onerror) onerror();
                }
            });
        }


        function loadData(data) {
            if (data.rt) self.rt(data.rt);
        }
        self.load = function(data) {
            if (data) {
                loadData(data);
            } else {
                $.getJSON(models.baseUrl + self.uri(), loadData);
            }
        }
        
        loadData(data);
    };
    Room.DISCONNECTED = "disconnected";
    Room.CONNECTED = "connected";
    Room.CONNECTING = "connecting";
    Room.current = ko.observable(null);
    Room.onEV = function(callback) {
        $("body").bind('EV', function(event, ev) {
            callback(event.data || ev);
        });
    };

    exports.models = exports.models || {};
    exports.models.Room = Room;
})(window);
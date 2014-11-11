(function(exports) {

    var ScheduleSlot = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.eventId = ko.observable(data.eventId);
        self.name = ko.observable(data.name);
        self.nbPresentations = ko.observable(data.presentations.length);
        self.presentations = ko.observableArray(_.chain(data.presentations)
            .map(function(presentation) { return ds.presentation(_.extend(presentation, {eventId: self.eventId()})); })
            .sortBy(function (p) { return p.type() + p.room().id(); })
            .value());
        self.fromTime = ko.observable(data.fromTime);
        self.toTime = ko.observable(data.toTime);
    }

    var ScheduleDay = function(data) {
        var self = this;
        self.id = ko.observable();
        self.eventId = ko.observable();
        self.uri = ko.observable();
        self.name = ko.observable();
        self.loading = ko.observable(false);
        self.latestRefreshTime = ko.observable(Date.now());
        setInterval(function(){
            self.latestRefreshTime(Date.now());
        }, 10 * 60 * 1000);
        self.nbPresentations = ko.observable();
        self.presentations = ko.observableArray([]);
        self.slots = ko.observableArray([]);
        self.showPastPresentationsOnToday = ko.observable(false);
        self.scheduleIsToday = ko.computed(function(){
            var slots = self.slots();
            var latestRefreshTime = self.latestRefreshTime();

            return slots.length
                && parseDateFromStr(slots[0].fromTime()) <= latestRefreshTime
                && parseDateFromStr(slots[slots.length-1].toTime()) >= latestRefreshTime;
        });
        self.futureSlots = ko.computed(function(){
            var slots = self.slots();
            var showPastPresentationsOnToday = self.showPastPresentationsOnToday();
            var latestRefreshTime = self.latestRefreshTime();

            // If today is the watching day, we should hide past presentations
            if(self.scheduleIsToday() && !showPastPresentationsOnToday) {
                return _(slots).filter(function(slot) {
                    return parseDateFromStr(slot.toTime()) > latestRefreshTime;
                });
            } else { // Otherwise, no filtering !
                return slots;
            }

        });
        self.slots.loading = ko.observable(false);
        self.hash = ko.computed(function() {return "index#!dayschedule~" + self.eventId() + "~" + self.id()});
        self.eventHash = ko.computed(function(){ return "index#!event~" + self.eventId(); });
        self.prevDayId = ko.observable(null);
        self.prevDayDefined = ko.computed(function(){ return !_.isNull(self.prevDayId()) && !_.isUndefined(self.prevDayId()); });
        self.prevDayHash = ko.computed(function() { return "index#!dayschedule~" + self.eventId() + "~" + self.prevDayId(); });
        self.nextDayId = ko.observable(null);
        self.nextDayDefined = ko.computed(function(){ return !_.isNull(self.nextDayId()) && !_.isUndefined(self.nextDayId()); });
        self.nextDayHash = ko.computed(function() { return "index#!dayschedule~" + self.eventId() + "~" + self.nextDayId(); });
        self.data = ko.observable({});

        function load(data) {
            if (self.data() && self.data().lastmodified
                    && self.data().lastmodified == data.lastmodified) {
                self.slots.loading(false);
                self.loading(false);
                console.log('data for day schedule is up to date ' + self.id());
                return;
            }
            data = mergeData(data, self);
            self.id(data.id);
            self.eventId(data.eventId);
            self.uri(data.id ? (data.uri || ('/events/' + data.eventId + '/day/' + data.id)) : '');
            self.name(data.name);
            self.prevDayId(data.prevDayId);
            self.nextDayId(data.nextDayId);
            var schedule = data.schedule;
            if (schedule) {
                self.presentations(_(schedule).map(function(presentation) { return ds.presentation(_.extend(presentation, {eventId: self.eventId()})); }));
                var sortedSlotsLabels = [];
                self.slots(
                    _.chain(schedule.sort(function(s1, s2) {
                        if(s1.fromTime === s2.fromTime) {
                            // If fromTime is the same, we should consider displaying
                            // longest slots first
                            return parseDateFromStr(s2.toTime) - parseDateFromStr(s1.toTime);
                        } else {
                            return parseDateFromStr(s1.fromTime) - parseDateFromStr(s2.fromTime);
                        }
                     })).groupBy(function(p) {
                        var formattedFromTime = dateFormat(new Date(parseDateFromStr(p.fromTime)), new Date(parseDateFromStr(p.fromTime)).getMinutes() ? 'H\'h\'MM' : 'H\'h\'');
                        var formattedToTime = dateFormat(new Date(parseDateFromStr(p.toTime)), new Date(parseDateFromStr(p.toTime)).getMinutes() ? 'H\'h\'MM' : 'H\'h\'');
                        var slotLabel = formattedFromTime+"-"+formattedToTime;
                        if(!_(sortedSlotsLabels).contains(slotLabel)) {
                            sortedSlotsLabels.push(slotLabel);
                        }
                        return slotLabel;
                     }).map(function(presentations, slot, slots) {

                        var currentSlotIndex = _(sortedSlotsLabels).indexOf(slot);
                        var previousSlotIndex = currentSlotIndex-1;
                        var nextSlotIndex = currentSlotIndex+1;

                        // Updating prev/next prez url on every presentation
                        _(presentations).each(function(pres, index) {
                            pres.nextPrezId = presentations[(index+1)%presentations.length].id;
                            pres.prevPrezId = presentations[(index+presentations.length-1)%presentations.length].id;

                            pres.nextSlotPrezId = nextSlotIndex<sortedSlotsLabels.length?slots[sortedSlotsLabels[nextSlotIndex]][0].id:null;
                            pres.prevSlotPrezId = previousSlotIndex>=0?slots[sortedSlotsLabels[previousSlotIndex]][0].id:null;

                            pres.dayId = data.id;
                            pres.dayScheduleSlot = slot;
                        });

                        return ds.scheduleSlot({
                            id: self.id() + '/' + slot,
                            eventId: self.eventId(),
                            name: slot,
                            presentations: presentations,
                            fromTime: presentations[0].fromTime,
                            toTime: presentations[0].toTime
                        });
                     }).value()
                );
                self.nbPresentations(schedule.length);
            } else {
                self.nbPresentations(data.nbPresentations);
                self.presentations([]);
                self.slots([]);
            }
            self.slots.loading(false);
            self.loading(false);
        }

        function loadStats(data) {
            _(self.presentations()).each(function(p) {
                var stats = data.presStats[p.id()];
                if (stats) {
                    p.load(stats);
                }
            });
        }

        load(data);

        self.refreshPresentations = function() {
            if (!self.slots().length) {
                self.slots.loading(true);
            }
            getJSON(self.uri(), function(data) {
                load(data);
                getJSON(self.uri() + '/stats', loadStats);
            });

        }

        self.enter = function() {
            self.refreshPresentations();
        }

        self.quit = function() {};
        self.load = function(data, onloaded) {
            if (data) {
                load(data);
                if (onloaded) onloaded(self);
            } else {
                if (!self.name()) { // check if already loaded
                    self.loading(true);
                    self.slots.loading(true);
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
    ScheduleDay.current = currentModelObject(new ScheduleDay({}));

    exports.models = exports.models || {};
    exports.models.ScheduleDay = ScheduleDay;
    exports.models.ScheduleSlot = ScheduleSlot;
})(window);
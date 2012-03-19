(function(exports) {

    var ScheduleSlot = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.eventId = ko.observable(data.eventId);
        self.name = ko.observable(data.name);
        self.nbPresentations = ko.observable(data.presentations.length);
        self.presentations = ko.observableArray(_.chain(data.presentations)
            .map(function(presentation) { return ds.presentation(_.extend(presentation, {eventId: self.eventId()})); })
            .sortBy(function (p) { return p.room().id(); })
            .value());
    }

    var ScheduleDay = function(data) {
        var self = this;
        self.id = ko.observable();
        self.eventId = ko.observable();
        self.uri = ko.observable();
        self.name = ko.observable();
        self.loading = ko.observable(false);
        self.nbPresentations = ko.observable();
        self.presentations = ko.observableArray([]);
        self.slots = ko.observableArray([]);
        self.slots.loading = ko.observable(false);
        self.hash = ko.computed(function() {return "#dayschedule~" + self.eventId() + "~" + self.id()});
        self.data = ko.observable({});

        function load(data) {
            data = mergeData(data, self);
            self.id(data.id);
            self.eventId(data.eventId);
            self.uri(data.id ? (data.uri || ('/events/' + data.eventId + '/day/' + data.id)) : '');
            self.name(data.name);
            var schedule = data.schedule;
            if (schedule) {
                self.presentations(_(schedule).map(function(presentation) { return ds.presentation(_.extend(presentation, {eventId: self.eventId()})); }));
                self.slots(_.chain(schedule).groupBy('slot').map(function(pres, slot) {
                    return ds.scheduleSlot({id: self.id() + '/' + slot, eventId: self.eventId(), name: slot, presentations: pres});
                }).value());
                self.nbPresentations(schedule.length);
            } else {
                self.nbPresentations(data.nbPresentations);
                self.presentations([]);
                self.slots([]);
            }
            self.slots.loading(false);
            self.loading(false);
        }

        load(data);

        self.refreshPresentations = function() {
            self.slots.loading(true);
            getJSON(self.uri(), load);
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
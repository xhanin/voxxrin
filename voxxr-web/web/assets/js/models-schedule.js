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
        self.id = ko.observable(data.id);
        self.eventId = ko.observable(data.eventId);
        self.uri = ko.observable(data.uri);
        self.name = ko.observable(data.name);
        self.nbPresentations = ko.observable(data.nbPresentations);
        self.presentations = ko.observableArray([]);
        self.slots = ko.observableArray([]);
        self.slots.loading = ko.observable(false);
        self.hash = ko.computed(function() {return "#dayschedule/" + self.eventId() + "/" + self.id()});

        self.refreshPresentations = function() {
            self.slots.loading(true);
            getJSON(self.uri(), function(data) {
                var schedule = data.schedule;
                self.presentations(_(schedule).map(function(presentation) { return ds.presentation(_.extend(presentation, {eventId: self.eventId()})); }));
                self.slots(_.chain(schedule).groupBy('slot').map(function(pres, slot) {
                    return ds.scheduleSlot({id: self.id() + '/' + slot, eventId: self.id(), name: slot, presentations: pres});
                }).value());
                self.nbPresentations(schedule.length);
                self.slots.loading(false);
            });
        }

        self.enter = function() {
            self.refreshPresentations();
        }

        self.quit = function() {}
    }
    ScheduleDay.current = ko.observable(null);

    exports.models = exports.models || {};
    exports.models.ScheduleDay = ScheduleDay;
    exports.models.ScheduleSlot = ScheduleSlot;
})(window);
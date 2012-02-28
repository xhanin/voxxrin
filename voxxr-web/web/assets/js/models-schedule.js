(function(exports) {

    var ScheduleSlot = function(data) {
        var self = this;
        self.id = ko.observable(data.id);
        self.name = ko.observable(data.name);
        self.nbPresentations = ko.observable(data.presentations.length);
        self.presentations = ko.observableArray(_.chain(data.presentations)
            .map(function(presentation) { return ds.presentation(presentation); })
            .sortBy(function (p) { return p.room().id(); })
            .value());
    }

    var ScheduleDay = function(data) {
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
            $.getJSON(models.baseUrl + self.uri(), function(data) {
                var schedule = data.schedule;
                self.presentations(_(schedule).map(function(presentation) { return ds.presentation(presentation); }));
                self.slots(_.chain(schedule).groupBy('slot').map(function(pres, slot) {
                    return ds.scheduleSlot({id: self.id + '/' + slot, name: slot, presentations: pres});
                }).value());
                self.nbPresentations(schedule.length);
                self.slots.loading(false);
            });
        }

        self.quit = function() {}
    }

    exports.models = exports.models || {};
    exports.models.ScheduleDay = ScheduleDay;
    exports.models.ScheduleSlot = ScheduleSlot;
})(window);
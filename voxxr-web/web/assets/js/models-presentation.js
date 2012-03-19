(function(exports) {

    var PresentationRate = function() {
        var self = this;
        self.nb = ko.observable(0);
        self.avg = ko.observable(0);
        self.avgDisplay = ko.computed(function() {
            return (self.avg() / 100).toFixed(2);
        });
    }

    var PresentationPoll = function(data) {
        var self = this;
        self.choices = ko.observableArray(data.choices);
    }

    var Presentation = function(data) {
        var self = this;

        self.id = ko.observable();
        self.eventId = ko.observable();
        self.uri = ko.observable();
        self.title = ko.observable(null);
        self.speakers = ko.observableArray(null);
        self.slot = ko.observable(null);
        self.fromTime = ko.observable(null);
        self.toTime = ko.observable(null);
        self.room = ko.observable({});
        self.summary = ko.observable(null);
        self.playing = ko.observable(false);
        self.rate = new PresentationRate();
        self.currentPoll = new PresentationPoll({choices:[]});
        self.loading = ko.observable(false);
        self.state = ko.observable('STOPPED');
        self.startedAt = ko.observable(null);
        self.timeElasped = ko.observable(0);
        self.time = ko.observable('');
        self.hotFactor = ko.observable(0);
        self.hash = ko.computed(function() {return "#presentation~" + self.eventId() + "~" + self.id()});
        self.data = ko.observable({});

        self.speakerNames = ko.computed(function() {
            return _(this.speakers()).map(function(s){return s.name();}).join(', ');
        }, self);

        self.withDetails = ko.observable(false);
        self.toggleDetails = function() { self.withDetails(!self.withDetails()) };
        self.moreOrLess = ko.computed(function() { return self.withDetails() ? '<<less' : 'more>>'});
        self.shortSummary = ko.computed(function() {
           return self.withDetails() ? self.summary() : (self.summary() && self.summary().length > 200) ?
               self.summary().substring(0, 197) + "..."
               : self.summary();
        });

        var cron = null;
        function updateTime() {
            self.time(new Date(new Date() - self.startedAt()).format('UTC:H:MM:ss'));
            cron = setTimeout(updateTime, 1000);
        }
        self.start = function() {
            self.state('STARTED');
            self.startedAt(new Date());
            self.timeElasped(0);
            updateTime();
        }
        self.stop = function() {
            self.state('STOPPED');
            self.startedAt(null);
            self.timeElasped(0);
            self.time('');
            clearTimeout(cron);
        }

        function loadData(data) {
            data = mergeData(data, self);
            self.id(data.id);
            self.eventId(data.eventId);
            self.uri(data.id ? (data.uri || ('/events/' + data.eventId + '/presentations/' + data.id)) : '');
            self.title(data.title);
            self.speakers(_(data.speakers).map(function(s) { return ds.speaker(s);}));
            self.slot(data.slot);
            self.fromTime(data.fromTime);
            self.toTime(data.toTime);
            self.room(ds.room(data.room ? data.room : {}));
            self.summary(data.summary);
            self.playing(data.playing ? true : false); // coalesce to boolean
            self.loading(false);
        }

        self.load = function(data, onloaded) {
            if (data) {
                loadData(data);
                if (onloaded) onloaded(self);
            } else {
                if (!self.summary()) { // check if already loaded
                    self.loading(true);
                    getJSON(self.uri(),
                        function(data) {
                            loadData(data); if (onloaded) onloaded(self);
                        });
                } else {
                     if (onloaded) onloaded(self);
                }
            }
        }

        loadData(data);

        self.enter = function() {}
        self.quit = function() {}
    }

    Presentation.current = currentModelObject(new Presentation({}));

    exports.models = exports.models || {};
    exports.models.Presentation = Presentation;
    exports.models.PresentationRate = PresentationRate;
    exports.models.PresentationPoll = PresentationPoll;
})(window);
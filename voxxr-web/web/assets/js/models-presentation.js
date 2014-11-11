(function(exports) {

    var PresentationRate = function() {
        var self = this;
        self.nb = ko.observable(0);
        self.avg = ko.observable(0);
        self.avgDisplay = ko.computed(function() {
            return (self.avg() / 100).toFixed(2);
        });
        self.updateRate = function(rateValue) {
            var rate = self;
            rate.avg(((rate.avg() * rate.nb()) + (rateValue * 100)) / (rate.nb() + 1));
            rate.nb(rate.nb() + 1);
        }
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
        self.type = ko.observable(null);
        self.speakers = ko.observableArray(null);
        self.slot = ko.observable(null);
        self.fromTime = ko.observable(null);
        self.toTime = ko.observable(null);
        self.room = ko.observable();
        self.summary = ko.observable(null);
        self.playing = ko.computed(function() {
            return self.room() && self.room().presentation() && self.room().presentation().id() == self.id();
        });
        self.rate = new PresentationRate();
        self.currentPoll = new PresentationPoll({choices:[]});
        self.loading = ko.observable(false);
        self.state = ko.observable('STOPPED');
        self.startedAt = ko.observable(null);
        self.timeElasped = ko.observable(0);
        self.favorites = ko.observable(0);
        self.involvedUsers = ko.observableArray([]);
        self.involvedUsers.followers = ko.computed(function() {
            if (!models.User.current()) return []; // for dashboard and poll
            var followerIds = _(models.User.current().twuser().followers()).map(function(twuser) { return twuser.id() });
            var friendsIds = _(models.User.current().twuser().friends()).map(function(twuser) { return twuser.id() });
            var favFol = _(self.involvedUsers()).filter(function(myPres) {
                return (myPres.favorite() || myPres.presence() !== 'NO')
                    && followerIds.indexOf(myPres.twuser().id()) >= 0
                    && friendsIds.indexOf(myPres.twuser().id()) === -1 // do not display friends in followers
            });

            _(favFol).map(function(fav){
               var completelyFilledUser = _(models.User.current().twuser().followers()).find(function(twuser){
                   return twuser.id() === fav.twuser().id();
               });
               fav.twuser().copyFrom(completelyFilledUser);
               return fav;
            });

            return favFol;
        });
        self.involvedUsers.friends = ko.computed(function() {
            if (!models.User.current()) return []; // for dashboard and poll
            var friendsIds = _(models.User.current().twuser().friends()).map(function(twuser) { return twuser.id() });
            var favFol = _(self.involvedUsers()).filter(function(myPres) {
                return (myPres.favorite() || myPres.presence() !== 'NO') && friendsIds.indexOf(myPres.twuser().id()) >= 0 });

            _(favFol).map(function(fav){
               var completelyFilledUser = _(models.User.current().twuser().friends()).find(function(twuser){
                   return twuser.id() === fav.twuser().id();
               });
               fav.twuser().copyFrom(completelyFilledUser);
               return fav;
            });

            return favFol;
        });
        self.involvedUsers.inroom = ko.computed(function() {
            if (!models.User.current()) return []; // for dashboard and poll
            return _(self.involvedUsers()).filter(function(myPres) { return myPres.presence() == 'IN' });
        });
        self.involvedUsers.findByUserid = function(userid) {
            return _(self.involvedUsers()).find(function(myPres) {
                return myPres.data().userid === userid
            });
        }
        self.time = ko.observable('');
        self.hotFactor = ko.observable(0);
        self.hash = ko.computed(function() {return "index#!presentation~" + self.eventId() + "~" + self.id()});
        self.my = ko.computed(function() {
            if (!models.User.current()) return null; // for dashboard and poll
            return models.User.current().my() ? models.User.current().my().presentation(self.eventId(), self.id()) : null
        });
        self.favorite = ko.computed(function() { return self.my() && self.my().favorite() });
        self.user = models.User.current;
        self.data = ko.observable({});
        self.nextPrezId = ko.observable(null);
        self.nextPrezHash = ko.computed(function() { return "index#!presentation~" + self.eventId() + "~" + self.nextPrezId(); });
        self.prevPrezId = ko.observable(null);
        self.prevPrezHash = ko.computed(function() { return "index#!presentation~" + self.eventId() + "~" + self.prevPrezId(); });
        self.nextSlotPrezId = ko.observable(null);
        self.nextSlotPrezDefined = ko.computed(function(){ return !_.isNull(self.nextSlotPrezId()) && !_.isUndefined(self.nextSlotPrezId()); });
        self.nextSlotPrezHash = ko.computed(function() { return "index#!presentation~" + self.eventId() + "~" + self.nextSlotPrezId(); });
        self.prevSlotPrezId = ko.observable(null);
        self.prevSlotPrezHash = ko.computed(function() { return "index#!presentation~" + self.eventId() + "~" + self.prevSlotPrezId(); });
        self.prevSlotPrezDefined = ko.computed(function(){ return !_.isNull(self.prevSlotPrezId()) && !_.isUndefined(self.prevSlotPrezId()); });
        self.dayId = ko.observable(null);
        self.backHash = ko.computed(function() { return "index#!dayschedule~" + self.eventId() + "~" + self.dayId(); });

        self.speakerNames = ko.computed(function() {
            return _(this.speakers()).map(function(s){return s.name();}).join(', ');
        }, self);


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
            var hasInvolvedUsers = data.involvedUsers;
            data = mergeData(data, self);
            self.id(data.id);
            self.eventId(data.eventId);
            self.uri(data.id ? (data.uri || ('/events/' + data.eventId + '/presentations/' + data.id)) : '');
            self.title(data.title);
            self.type(data.type);
            self.speakers(_(data.speakers).map(function(s) { return ds.speaker(s);}));
            if(self.slot() === null || data.dayScheduleSlot) {
                self.slot(data.dayScheduleSlot || data.slot);
            }
            self.favorites(data.favorites);
            self.fromTime(data.fromTime);
            self.toTime(data.toTime);
            self.room(ds.room(data.room ? data.room : {}));
            self.summary(data.summary);
            self.prevPrezId(data.prevPrezId);
            self.nextPrezId(data.nextPrezId);
            self.prevSlotPrezId(data.prevSlotPrezId);
            self.nextSlotPrezId(data.nextSlotPrezId);
            self.dayId(data.dayId);
            if (hasInvolvedUsers) {
                self.involvedUsers(_(data.involvedUsers).map(function(myPres) {
                    return ds.myPresentation(_.extend({id: myPres.id
                        || (myPres.userid + '/' + myPres.eventId + '/' + myPres.presId)}, myPres))
                }));
            }
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

        self.loadStats = function() {
            getJSON(self.uri() + '/stats', loadData);
        }

        loadData(data);

        self.enter = function() {
            self.load();
            self.loadStats();
            _(self.speakers()).each(function(speaker) { speaker.load() });
        }
        self.quit = function() {}
    }

    Presentation.current = currentModelObject();

    exports.models = exports.models || {};
    exports.models.Presentation = Presentation;
    exports.models.PresentationRate = PresentationRate;
    exports.models.PresentationPoll = PresentationPoll;
})(window);
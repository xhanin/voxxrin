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
            return favFol;
        });
        self.involvedUsers.friends = ko.computed(function() {
            if (!models.User.current()) return []; // for dashboard and poll
            var friendsIds = _(models.User.current().twuser().friends()).map(function(twuser) { return twuser.id() });
            var favFol = _(self.involvedUsers()).filter(function(myPres) {
                return (myPres.favorite() || myPres.presence() !== 'NO') && friendsIds.indexOf(myPres.twuser().id()) >= 0 });
            return favFol;
        });
        self.involvedUsers.inroom = ko.computed(function() {
            if (models.User.current()) return []; // for dashboard and poll
            return _(self.involvedUsers()).filter(function(myPres) { return myPres.presence() == 'IN' });
        });
        self.involvedUsers.findByUserid = function(userid) {
            return _(self.involvedUsers()).find(function(myPres) {
                return myPres.data().userid === userid
            });
        }
        self.time = ko.observable('');
        self.hotFactor = ko.observable(0);
        function hashOf(eventId, presentationId){
            return "#presentation~" + eventId + "~" + presentationId;
        }
        self.hash = ko.computed(function() {return hashOf(self.eventId(), self.id()) });
        self.my = ko.computed(function() {
            if (!models.User.current()) return null; // for dashboard and poll
            return models.User.current().my() ? models.User.current().my().presentation(self.eventId(), self.id()) : null
        });
        self.favorite = ko.computed(function() { return self.my() && self.my().favorite() });
        self.user = models.User.current;
        self.data = ko.observable({});

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
            self.speakers(_(data.speakers).map(function(s) { return ds.speaker(s);}));
            self.slot(data.slot);
            self.favorites(data.favorites);
            self.fromTime(data.fromTime);
            self.toTime(data.toTime);
            self.room(ds.room(data.room ? data.room : {}));
            self.summary(data.summary);
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

        function findAndSortPresentationsInCurrentSlot(){
            var currentSlotPresentations = models.ScheduleDay.current()?models.ScheduleDay.current().data().schedule:[];
            currentSlotPresentations = _.filter(currentSlotPresentations, function(presentation){
                return models.Presentation.current() && presentation.slot === models.Presentation.current().data().slot;
            });
            currentSlotPresentations = _.sortBy(currentSlotPresentations, function(presentation){ return presentation.id; });
            return currentSlotPresentations;
        }
        function findIndexForCurrentPresentationIn(presentations){
            if(!models.Presentation.current()){
                return -1;
            }
            var presentationIds = _.map(presentations, function(presentation){ return presentation.id; });
            return _.indexOf(presentationIds, models.Presentation.current().data().id);
        }
        function findPresentationInSameSlot(delta){
            var currentSlotPresentations = findAndSortPresentationsInCurrentSlot();
            var currentPresentationIndex = findIndexForCurrentPresentationIn(currentSlotPresentations);

            if(currentPresentationIndex === -1){
                return null;
            }

            // modulo is a bitcomplicated here, due modulo bug (for negative numbers)
            // more info here : http://javascript.about.com/od/problemsolving/a/modulobug.htm
            return currentSlotPresentations[(currentPresentationIndex+currentSlotPresentations.length+delta)%currentSlotPresentations.length];
        }
        self.nextInSlot = ko.computed(function() {
            return findPresentationInSameSlot(1);
        });
        self.previousInSlot = ko.computed(function(){
            return findPresentationInSameSlot(-1);
        });
        self.nextInSlotHash = ko.computed(function() {
            return self.nextInSlot()?hashOf(self.eventId(), self.nextInSlot().id):null;
        });
        self.previousInSlotHash = ko.computed(function() {
            return self.previousInSlot()?hashOf(self.eventId(), self.previousInSlot().id):null;
        });
    }

    Presentation.current = currentModelObject();

    exports.models = exports.models || {};
    exports.models.Presentation = Presentation;
    exports.models.PresentationRate = PresentationRate;
    exports.models.PresentationPoll = PresentationPoll;
})(window);
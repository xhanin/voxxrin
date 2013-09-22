var http = require("http"),
    Q = require('q'),
    _ = require('underscore'),
    url = require('url'),
    dateformat = require('dateformat'),
    load = require("./load.js"),
    send = require("./send.js"),
    request = require('request'),
    token = require('./authorizationToken');

module.exports = function(opts){
    var self = this;

    function crawlEvent(baseUrl, event) {
        console.log('start crawling on '+self.options.name+' (event ' + event + ')');
        self.currentContext = { baseUrl: baseUrl, event: event };

        var urlPromises = _.map(self.options.initialCrawlingUrls(event), self.options.initialUrlParsingCallback);
        Q.all(urlPromises).spread(function(){
            var promisesResults = Array.prototype.slice.call(arguments);

            self.options.logInitialCrawlingResults.apply(self, promisesResults);

            var scheduleDeferred = Q.defer();
            self.options.extractSortedScheduleFromInitialCrawling.apply(self, [scheduleDeferred].concat(promisesResults));
            Q.when(scheduleDeferred.promise).then(function(sortedSchedule){
                self.currentContext.sortedSchedule = sortedSchedule;
                self.event = self.options.extractEventFromInitialCrawling.apply(self, promisesResults);
                self.rooms = self.options.extractRoomsFromInitialCrawling.apply(self, promisesResults);
                _(self.rooms).each(function(room) {
                    room.uri = '/rooms/' + room.id;
                });

                _(self.rooms).each(function(r) {
                    send(baseUrl + '/r' + r.uri, r).then(function() {
                        console.log('ROOM:', r);
                    }).fail(self.options.onFailureCallback);
                });

                _(self.event.dayDates).each(function(dayDate, i){
                    var dayId = self.event.id + '-' + i;
                    self.event.days.push({
                        'id': dayId,
                        'name': dateformat(dayDate, 'mmm dd'),
                        'uri': '/events/' + self.event.id + '/day/' + dayId,
                        'nbPresentations': 0
                    });
                    self.daySchedules[dateformat(dayDate, 'yyyy-mm-dd')] = {
                        'id': dayId,
                        'dayNumber': i,
                        'schedule': []
                    };
                });

            var presentationInfosPromises = [];
                _(self.currentContext.sortedSchedule).each(function(s, i) {
                    self.event.nbPresentations++;
                    var fromTime = new Date(Date.parse(s.fromTime)),
                        daySchedule = self.daySchedules[dateformat(fromTime, 'yyyy-mm-dd')];

                    _(s.speakers).each(function(sp) {
                        // Generating speaker uri
                        sp.uri = '/events/' + self.event.id + '/speakers/' + sp.id;

                        Q.when(self.options.fetchSpeakerInfosFrom.call(self, Q.defer(), sp))
                        .then(function(fetchedSpeaker) {
                            var speakerImage = fetchedSpeaker.imageUrl;
                            delete fetchedSpeaker.imageUrl;
                            var voxxrinSpeakerUri;
                            if(speakerImage) {
                                var imageExt = speakerImage.substring(speakerImage.lastIndexOf('.'));
                                imageExt = imageExt.length > 5 ? ".png" : imageExt;
                                voxxrinSpeakerUri = "/events/" + self.event.id + "/speakers/" + fetchedSpeaker.id + "/picture" + imageExt;
                            } else {
                                voxxrinSpeakerUri = null;
                            }

                            fetchedSpeaker.pictureURI = voxxrinSpeakerUri;

                            // Updating initial speaker object's pictureURI
                            sp.pictureURI = voxxrinSpeakerUri;

                            send(baseUrl + '/r' + sp.uri, fetchedSpeaker)
                            .then(function() {
                                if(speakerImage){
                                    self.provideSpeakerImage(speakerImage, voxxrinSpeakerUri);
                                }
                                console.log('SPEAKER: ', fetchedSpeaker.id, fetchedSpeaker.name);
                            }).fail(self.options.onFailureCallback);
                        }).fail(self.options.onFailureCallback);
                    });

                    var voxxrinPres = {
                        'id': self.options.prefix + s.id,
                        'title': s.title,
                        'type': s.type,
                        'kind': s.kind,
                        'previousId': self.options.prefix + self.currentContext.sortedSchedule[(i-1+self.currentContext.sortedSchedule.length)%self.currentContext.sortedSchedule.length].id,
                        'nextId': self.options.prefix + self.currentContext.sortedSchedule[(i+1)%self.currentContext.sortedSchedule.length].id,
                        'dayId': daySchedule.id,
                        'uri': '/events/' + self.event.id + "/presentations/" + self.options.prefix + s.id,
                        'speakers': s.speakers,
                        'room': _(self.rooms).find(function(room){ return room.name === (s.roomName?s.roomName:"???"); }),
                        'slot': dateformat(fromTime, fromTime.getMinutes() ? 'h:MMtt' : 'htt'),
                        'fromTime': typeof(s.fromTime) === "string" ? s.fromTime : dateformat(s.fromTime,"yyyy-mm-dd HH:MM:ss.0"),
                        'toTime': typeof(s.toTime) === "string" ? s.toTime : dateformat(s.toTime,"yyyy-mm-dd HH:MM:ss.0")
                    };

                    var shouldStop = self.options.decorateVoxxrinPresentation.call(self, voxxrinPres, daySchedule);
                    if(shouldStop){
                        return;
                    }

                    self.event.days[daySchedule.dayNumber].nbPresentations++;

                    var presentationInfoPromise = self.options.fetchPresentationInfosFrom.call(self, Q.defer(), s, voxxrinPres);
                    presentationInfosPromises.push(presentationInfoPromise);
                    Q.when(presentationInfoPromise)
                    .then(function(presentationInfos) {
                        daySchedule.schedule.push(presentationInfos);

                        send(baseUrl + '/r' + voxxrinPres.uri, presentationInfos)
                        .then(function() {console.log('PRESENTATION: ', voxxrinPres.title, daySchedule.id, voxxrinPres.slot)})
                        .fail(self.options.onFailureCallback);
                    });
                });

                delete self.event.dayDates;
                send(baseUrl + '/r/events', self.event).then(function() {
                    console.log('EVENT:', self.event);
                }).fail(self.options.onFailureCallback);

                // Waiting for every presentations being persisted
                Q.all(presentationInfosPromises).spread(function(){
                    _(self.daySchedules).each(function (ds) {
                        send(baseUrl + '/r/events/' + self.event.id + '/day/' + ds.id, ds).then(function(){
                            console.log('DAY SCHEDULE:', ds.id, ' LENGTH:', ds.schedule.length);
                        }).fail(self.options.onFailureCallback);
                    });
                });
            });
        });
    }

    self.crawl = function(baseUrl) {
        _(self.options.events).each(function(event){
            crawlEvent(baseUrl, event);
        });
    };

    self.provideSpeakerImage = function(pictureUri, voxxrinPictureUri) {
        console.log("Fetching picture "+pictureUri+" ...");
        request.get(pictureUri).pipe(request.put({
            url: self.currentContext.baseUrl + '/r' + voxxrinPictureUri,
            headers: {
                'Authorization':token
            }
        }, function(error, response, body){
            if(error){
                console.error("Error while importing speaker picture "+pictureUri+" to "+voxxrinPictureUri);
            } else {
                console.log("Speaker picture "+pictureUri+" fetched successfully to "+voxxrinPictureUri + " !");
            }
        }));
    };

    self.formatDates = function (from, to) {
        if (from === to || from.getDay() === to.getDay()) {
            return dateformat(from, 'mmm dd, yyyy');
        } else if (from.getMonth() === to.getMonth()) {
            return dateformat(from, 'mmm') + ' '
                + from.getDate() + '-' + to.getDate()
                + ', ' + dateformat(from, 'yyyy');
        } else if (from.getYear() === to.getYear()) {
            return dateformat(from, 'mmm dd') + ' - '
                + dateformat(to, 'mmm dd, yyyy');
        } else {
            return dateformat(from, 'mmm dd, yyyy') + ' - ' + dateformat(to, 'mmm dd, yyyy');
        }
    };

    self.calculateDayDates = function(from, to) {
        var dayDates = [], day, i;
        for (day = new Date(from.getTime()), i=0; day.getTime() <= to.getTime(); day.setDate(day.getDate() + 1), i++) {
            dayDates.push(new Date(day.getTime()));
        }
        return dayDates;
    };

    (function(opts){
        self.options = _.extend({
            name: 'noname',
            prefix: 'nopfx',
            events: [],
            onFailureCallback: function(err) { console.log('ERROR', err); },
            initialCrawlingUrls: function(event){ throw "Should be implemented : initialCrawlingUrls" },
            initialUrlParsingCallback: load, // By default : parsing content as JSON
            logInitialCrawlingResults: function(){ console.log("Initial promises fetched !"); },
            extractSortedScheduleFromInitialCrawling: function(deferred, firstUrlResult, secondUrlResult, etc) { throw "Should be implemented : extractSortedScheduleFromInitialCrawling" },
            extractEventFromInitialCrawling: function(firstUrlResult, secondUrlResult, etc){ throw "Should be implemented : extractEventFromInitialCrawling" },
            extractRoomsFromInitialCrawling: function(firstUrlResult, secondUrlResult, etc){ throw "Should be implemented : extractRoomsFromInitialCrawling" },
            fetchSpeakerInfosFrom: function(deferred, speaker) { throw "Should be implemented : fetchSpeakerInfosFrom" },
            decorateVoxxrinPresentation: function(voxxrinPres, daySchedule){ return false; },
            fetchPresentationInfosFrom: function(deferred, schedule, voxxrinPres){ throw "Should be implemented : fetchPresentationInfosFrom" }
        }, opts);

        self.onDeferredFailureCallback = function(err){
            this.deferred.reject(new Error(err));
        };

        self.event = {};
        self.rooms = {};
        self.daySchedules = {};
    })(opts);
};
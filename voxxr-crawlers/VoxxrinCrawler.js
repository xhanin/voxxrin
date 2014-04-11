var http = require("http"),
    Q = require('q'),
    _ = require('underscore'),
    url = require('url'),
    dateformat = require('dateformat'),
    load = require("./load.js"),
    send = require("./send.js"),
    moment = require('moment-timezone'),
    request = require('request'),
    token = require('./authorizationToken');

module.exports = function(opts){
    var self = this;
    self.sendQueries = 0;
    self.sendQueryErrors = 0;
    self.loadQueries = 0;
    self.loadQueryErrors = 0;

    function extractUniqueRoomsFrom(sortedSchedule, eventId) {
        var i=0;
        return _.chain(sortedSchedule).pluck('roomName').uniq(false).sortBy(function(r) { return r; }).map(function(r) {
           return {
               id: (eventId + "-" + i++).toLowerCase(),
               name: r
           };
       }).value();
    }

    self.crawlEvent = function(baseUrl, event, debugQueries) {
        console.log('start crawling on ' + self.options.name + ' (event ' + event + ')');
        if (debugQueries) {
            setInterval(function () {
                console.log("Sent queries : " + self.sendQueries + ", errors : " + self.sendQueryErrors);
                console.log("Loaded queries : " + self.loadQueries + ", errors : " + self.loadQueryErrors);
            }, 5000);
        }
        self.currentContext = { baseUrl: baseUrl, event: event };

        var urlPromises = _.map(self.options.initialCrawlingUrls(event), self.options.initialUrlParsingCallback);
        Q.all(urlPromises).spread(function(){
            var promisesResults = Array.prototype.slice.call(arguments);

            self.options.logInitialCrawlingResults.apply(self, promisesResults);

            var scheduleDeferred = Q.defer();
            console.log("Retrieving schedule...");
            self.options.extractScheduleFromInitialCrawling.apply(self, [scheduleDeferred].concat(promisesResults));
            Q.when(scheduleDeferred.promise).then(function(schedule){
                console.log("Schedule fetched !");
                self.currentContext.sortedSchedule = _(schedule).sortBy(function(s) { return s.fromTime; });

                var fromTime = self.currentContext.sortedSchedule[0].fromTime;
                var toTime = self.currentContext.sortedSchedule[self.currentContext.sortedSchedule.length - 1].toTime;

                self.event = self.options.extractEventFromInitialCrawling.apply(self, promisesResults);
                self.event = _.extend({}, {
                    id: (self.options.prefix + event.id).toLowerCase(),
                    title: self.currentContext.event.title,
                    description: self.currentContext.event.description,
                    timezone: self.currentContext.event.timezone || "Europe/Paris",
                    dates: self.formatDates(fromTime, toTime),
                    from: fromTime,
                    to: toTime,
                    nbPresentations: 0,
                    days: [],
                    enabled: true,
                    dayDates: self.calculateDayDates(fromTime, toTime)
                }, self.event);

                self.rooms = extractUniqueRoomsFrom(self.currentContext.sortedSchedule, self.event.id);
                _(self.rooms).each(function(room) {
                    room.uri = '/rooms/' + room.id;
                });

                _(self.rooms).each(function(r) {
                    self.sendQueries++;
                    send(baseUrl + '/r' + r.uri, r).then(function() {
                        console.log('ROOM:', r);
                    }).fail(self.options.onFailureCallback);
                });

                _(self.event.dayDates).each(function(dayDate, i){
                    var dayId = (self.event.id + '-' + i).toLowerCase();
                    self.event.days.push({
                        'id': dayId.toLowerCase(),
                        'name': dateformat(dayDate, 'mmm dd'),
                        'uri': '/events/' + self.event.id + '/day/' + dayId,
                        'nbPresentations': 0
                    });
                    self.daySchedules[dateformat(dayDate, 'yyyy-mm-dd')] = {
                        'id': dayId.toLowerCase(),
                        'dayNumber': i,
                        'schedule': []
                    };
                });

                var daySchedulesPromises = [];
                _(self.currentContext.sortedSchedule).each(function(s, scheduleIndex) {
                    console.log("Handling talk number "+scheduleIndex+"...");

                    self.event.nbPresentations++;
                    var fromTime = new Date(Date.parse(s.fromTime)),
                        daySchedule = self.daySchedules[dateformat(fromTime, 'yyyy-mm-dd')];

                    var speakersDeferred = [];
                    _(s.speakers).each(function(sp, speakerIndex) {
                        console.log("Handling speaker "+speakerIndex+"...");

                        // Generating speaker uri
                        sp.uri = '/events/' + self.event.id + '/speakers/' + sp.id;

                        var speakerDeferred = Q.defer();
                        speakersDeferred.push(speakerDeferred.promise);

                        var speakerInfosDeferred = Q.defer();
                        self.options.fetchSpeakerInfosFrom.call(self, speakerInfosDeferred, sp);
                        Q.when(speakerInfosDeferred.promise)
                        .then(function(fetchedSpeaker) {
                            console.log("Speaker infos "+speakerIndex+" for talk "+scheduleIndex+" fetched !");

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
                            speakerDeferred.resolve();

                            self.sendQueries++;
                            send(baseUrl + '/r' + sp.uri, fetchedSpeaker)
                            .then(function() {
                                if(speakerImage){
                                    self.provideSpeakerImage(speakerImage, voxxrinSpeakerUri);
                                }
                                console.log('SPEAKER: ', fetchedSpeaker.id, fetchedSpeaker.name);
                            }).fail(self.options.onFailureCallback);
                        }).fail(_.bind(self.onDeferredFailureCallback, {deferred: speakerInfosDeferred}));
                    });

                    var prezId = (self.options.prefix + s.id).toLowerCase().replace(/_/gi, "-");
                    var voxxrinPres = {
                        'id': prezId,
                        'title': s.title,
                        'type': s.type,
                        'kind': s.kind,
                        'dayId': daySchedule.id,
                        'uri': '/events/' + self.event.id + "/presentations/" + prezId,
                        'speakers': s.speakers,
                        'room': _(self.rooms).find(function(room){ return room.name === (s.roomName?s.roomName:"???"); }),
                        'slot': dateformat(fromTime, fromTime.getMinutes() ? 'h:MMtt' : 'htt'),
                        'fromTime': typeof(s.fromTime) === "string" ? s.fromTime : moment(s.fromTime).tz(self.event.timezone).format("YYYY-MM-DD HH:mm:ss.0"),
                        'toTime': typeof(s.toTime) === "string" ? s.toTime : moment(s.toTime).tz(self.event.timezone).format("YYYY-MM-DD HH:mm:ss.0")
                    };

                    var shouldStop = self.options.decorateVoxxrinPresentation.call(self, voxxrinPres, daySchedule);
                    if(shouldStop){
                        return;
                    }

                    console.log("Presentation "+scheduleIndex+" ready...");

                    self.event.days[daySchedule.dayNumber].nbPresentations++;

                    var presentationInfoPromise = Q.defer();
                    self.options.fetchPresentationInfosFrom.call(self, presentationInfoPromise, s, voxxrinPres);

                    var daySchedulePromise = Q.defer();
                    daySchedulesPromises.push(daySchedulePromise.promise);

                    Q.all([presentationInfoPromise.promise].concat(speakersDeferred))
                    .spread(function(presentationInfos) {
                        console.log("Presentation "+scheduleIndex+" required infos available !");

                        daySchedule.schedule.push(presentationInfos);
                        daySchedulePromise.resolve(presentationInfos);

                        self.sendQueries++;
                        send(baseUrl + '/r' + voxxrinPres.uri, presentationInfos)
                        .then(function() {console.log('PRESENTATION: ', voxxrinPres.title, daySchedule.id, voxxrinPres.slot)})
                        .fail(self.options.onFailureCallback);
                    });
                });

                delete self.event.dayDates;
                delete self.event.initialCrawlingUrls;
                self.sendQueries++;
                send(baseUrl + '/r/events', self.event).then(function() {
                    console.log('EVENT:', self.event);
                }).fail(self.options.onFailureCallback);

                // Waiting for every presentations being persisted
                Q.all(daySchedulesPromises).spread(function(){
                    _(self.daySchedules).each(function (ds) {
                        self.sendQueries++;
                        send(baseUrl + '/r/events/' + self.event.id + '/day/' + ds.id, ds).then(function(){
                            console.log('DAY SCHEDULE:', ds.id, ' LENGTH:', ds.schedule.length);
                        }).fail(self.options.onFailureCallback);
                    });
                });
            });
        });
    };

    self.crawl = function(baseUrl, debugQueries) {
        _(self.options.events).each(function(event){
            self.crawlEvent(baseUrl, event, debugQueries);
        });
    };

    self.provideSpeakerImage = function(pictureUri, voxxrinPictureUri) {
        console.log("Fetching picture "+pictureUri+" ...");
        self.sendQueries++;
        self.loadQueries++;
        request.get({ uri: pictureUri, headers: { 'User-Agent': 'Node' } }).pipe(request.put({
            uri: self.currentContext.baseUrl + '/r' + voxxrinPictureUri,
            headers: {
                'Authorization':token.gae
            }
        }, function(error, response, body){
            if(error){
                self.sendQueryErrors++;
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
            name: 'noname', // MANDATORY, a simple string describing event name
            prefix: 'nopfx', // MANDATORY, a tiny string allowing to prefix urls. Some sort of url namespace.
            /**
             * Array of objects like this :
             * {
             *   id: integer, // An id allowing to distinguish an event from another one in current event family
             *   title: string, // Name of this event which will be displayed in the events list
             *   // List of crawling urls associated with this event
             *   // If every initial crawling URLs could be calculated from the same event info in the event family,
             *   // you could pass an opt.initialCrawlingUrls as well
             *   initialCrawlingUrls: [string]
             *   **
             *     Eventually other specific fields you will need in extractScheduleFromInitialCrawling() and
             *     extractEventFromInitialCrawling() methods
             *     In general, we prefix these field names with double underscores '__'
             *   **
             * }
             * Current event object will be made available in self.currentContext.event
             */
            events: [],
            /**
             * Not mandatory, by default, will display the error message in console
             */
            onFailureCallback: function(err) {
                self.sendQueryErrors++;
                console.log('ERROR', err);
            },
            /**
             * Not mandatory, by default, will return current configured event's `initialCrawlingUrls` field
             * Purpose is to generate a [string] containing every urls to fetch at the beginning of the crawling process
             * Results of these urls will be passed as varargs to extractScheduleFromInitialCrawling() and
             * extractEventFromInitialCrawling() callbacks
             */
            initialCrawlingUrls: function(event){ return event.initialCrawlingUrls; },
            /**
             * Define the way initial urls results are parsed
             * By default, result will be parsed as JSON object, but you could change this implementation, for instance,
             * to consider urls are returning HTML content
             * Important note : this method should return a promise, resolved once the content has been parsed to an
             * object representation (JSON object, HTML string, whatever)
             */
            initialUrlParsingCallback: load, // By default : parsing content as JSON
            /**
             * Some hint saying initial urls have been fetched
             * No big deal here...
             */
            logInitialCrawlingResults: function(){ console.log("Initial urls fetched !"); },
            /**
             * Converting initialUrls results into a sorted Schedule object, representing every talks
             * for the event.
             * This object should look like this :
             * [
             *   {
             *     'id': integer, // unique id for current talk
             *     'title': string, // Talk's summary
             *     'type': string, // Type of talk, could be, for instance, 'University', 'Hands-on Labs', 'Tools in Action', 'Conference', 'Quickie', 'BOF', or whatever
             *     'kind': 'Talk'|'Keynote', // Type of talk, special cases for Keynotes
             *     'speakers': [
             *       {
             *         'id': integer, // Unique speaker id
             *         'name': string, // Speaker name
             *         **
             *           Eventually other specific fields you will need in fetchSpeakerInfosFrom() method
             *           In general, we prefix these field names with double underscore '__'
             *         **
             *       },
             *       ...
             *     ],
             *     'fromTime': date, // datetime start of the talk
             *     'toTime': date, // datetime end of the talk
             *     'roomName': string, // Room's name for the talk
             *     **
             *       Eventually other specific fields you will need in fetchPresentationInfosFrom() method
             *       In general, we prefix these field names with double underscore '__'
             *     **
             *   },
             *   ...
             * ]
             *
             * This method is a deferred-oriented method, where, once you have built the sorted schedule, you should call
             * deferred.resolve(sortedSchedule).
             * This makes xhr calls to subsequent urls (for speaker infos for instance) possible
             *
             * Additionnal arguments are the result of fetched initialCrawlingUrls where initialUrlParsingCallback()
             * has been applied
             */
            extractScheduleFromInitialCrawling: function(deferred, firstUrlResult, secondUrlResult, etc) { throw "Should be implemented : extractScheduleFromInitialCrawling" },
            /**
             * Converting initialUrls results into an Event object, representing every talks
             * for the event.
             * This object should look like this :
             * {
             *   'id': string, // Unique event id for voxxrin. Generally made of this.options.prefix + some unique id
             *   'subtitle': '', // Useless ???
             *   'location': string // Place where the event takes place
             * }
             *
             * Additionnal arguments are the result of fetched initialCrawlingUrls where initialUrlParsingCallback()
             * has been applied
             */
            extractEventFromInitialCrawling: function(firstUrlResult, secondUrlResult, etc){ throw "Should be implemented : extractEventFromInitialCrawling" },
            /**
             * Converting speakers info fetched during extractScheduleFromInitialCrawling, into
             * a more complex speaker object
             * This object should look like this :
             * {
             *   'id': integer, // Unique speaker id
             *   'name': string, // Speaker name
             *   'bio': string, // Speaker bio
             *   'imageUrl': url // Speaker picture image (should be a url)
             * }
             * This method is a deferred-oriented method, where, once you have built the Speaker object, you should call
             * deferred.resolve(speaker).
             * This makes xhr calls to subsequent urls (for additionnal speaker infos for instance) possible
             *
             * Speaker argument is the speaker object result from extractScheduleFromInitialCrawling()
             */
            fetchSpeakerInfosFrom: function(deferred, speaker) { throw "Should be implemented : fetchSpeakerInfosFrom" },
            /**
             * Allowing to decorate initial presentation object, created during extractScheduleFromInitialCrawling()
             * This method could be useful to remove unwanted properties on the object
             *
             * The method should return a boolean allowing to omit (when true) given presentation
             * Omitting a presentation won't persist it
             */
            decorateVoxxrinPresentation: function(voxxrinPres, daySchedule){ return false; },
            /**
             * Allowing to decorate initial Presentation by fetching additionnal informations
             * This object should look like this :
             * {
             *   'summary': string, // Presentation's description
             *   'track': string, // Facultative, presentation's track name
             *   'experience': 0, // Computable
             *   'tags': [string], // List of tags qualifying presentation
             *
             *   ... and attributes from extractScheduleFromInitialCrawling() call :
             *
             *   'id': integer, // unique id for current talk
             *   'title': string, // Talk's summary
             *   'type': string, // Type of talk, could be, for instance, 'University', 'Hands-on Labs', 'Tools in Action', 'Conference', 'Quickie', 'BOF', or whatever
             *   'kind': 'Talk'|'Keynote', // Type of talk, special cases for Keynotes
             *   'speakers': [
             *     {
             *       'id': integer, // Unique speaker id
             *       'name': string, // Speaker name
             *       **
             *         Eventually other specific fields you will need in fetchSpeakerInfosFrom() method
             *         In general, we prefix these field names with double underscore '__'
             *       **
             *     },
             *     ...
             *   ],
             *   'fromTime': date, // datetime start of the talk
             *   'toTime': date, // datetime end of the talk
             *   'roomName': string, // Room's name for the talk
             * }
             *
             * This method is a deferred-oriented method, where, once you have built the Presentation object, you should call
             * deferred.resolve(presentation).
             * This makes xhr calls to subsequent urls (for additionnal event infos for instance) possible
             */
            fetchPresentationInfosFrom: function(deferred, schedule, voxxrinPres){ throw "Should be implemented : fetchPresentationInfosFrom" }
        }, opts);

        self.onDeferredFailureCallback = function(err){
            self.loadQueryErrors++;
            this.deferred.reject(new Error(err));
        };

        self.event = {};
        self.rooms = {};
        self.daySchedules = {};
    })(opts);
};
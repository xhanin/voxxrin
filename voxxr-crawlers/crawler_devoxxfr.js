var VoxxrinCrawler = require('./VoxxrinCrawler.js'),
    Q = require('q'),
    _ = require('underscore'),
    load = require("./load.js"),
    dateformat = require('dateformat'),
    send = require("./send.js");

module.exports = new VoxxrinCrawler({
    name: 'DevoxxFr',
    prefix: 'dvxfr',
    events: [
        {
            /* Devoxx Fr 2014 */
            id: 14,
            /* Hardcoding some event details here, since not provided by REST API */
            from: new Date(Date.parse("2014-04-16T08:00:00.000+02:00")),
            to: new Date(Date.parse("2014-04-18T18:55:00.000+02:00")),
            title: "Devoxx France 2014",
            subtitle: "",
            description: "",
            location: "Mariott Hotel",
            initialCrawlingUrls: [
                "http://cfp.devoxx.fr/api/conferences/devoxxFR2014/schedules/wednesday",
                "http://cfp.devoxx.fr/api/conferences/devoxxFR2014/schedules/thursday",
                "http://cfp.devoxx.fr/api/conferences/devoxxFR2014/schedules/friday"
            ]
        }
    ],
    logInitialCrawlingResults: function(){
        var schedules = arguments;
        var presentationCount = 0;
        _.each(schedules, function(schedule) {
            presentationCount += schedule.slots.length;
        });
        console.log("loaded event DevoxxFr, " + presentationCount + " presentations");
    },
    extractScheduleFromInitialCrawling: function(deferred, schedule) {
        var deferred = arguments[0];
        var slots = [];
        for(var i=1; i<arguments.length; i++) {
            var splittedCorrespondingUrl = this.currentContext.event.initialCrawlingUrls[i-1].split("/");
            var scheduleDay = splittedCorrespondingUrl[splittedCorrespondingUrl.length-1].substr(0,3);
            var daySlots = arguments[i].slots;

            // For each slots, remembering their corresponding day, because we could have slots having the same
            // ids on different days (thus, we should append the day name to the id later...)
            var enhancedDaySlots = _.map(daySlots, function(daySlot) { return _.extend({}, daySlot, { day: scheduleDay }); });

            slots.push.apply(slots, enhancedDaySlots);
        }

        var self = this;
        // Parsing dates and adding "virtual" start and end time for all-day running events
        var schedules = _(slots).map(function(s) {
            try {
                var title, id, type, kind, speakers, summary, track;
                if (s.break) {
                    // We should use slotId because "dej" slots have the same id on different days
                    id = s.slotId;
                    title = s.break.nameFR;
                    type = "Break";
                    kind = "Break";
                    speakers = [];
                    summary = "";
                    track = null;
                } else if(s.talk) {
                    id = s.talk.id;
                    title = s.talk.title;
                    type = s.talk.talkType;
                    kind = "Talk";
                    speakers = _.map(s.talk.speakers, function (speaker) {
                        var splittedHref = speaker.link.href.split("/");
                        return {
                            id: splittedHref[splittedHref.length - 1],
                            name: speaker.name,
                            __href: speaker.link.href
                        };
                    });
                    summary = s.talk.summary;
                    track = s.talk.track;
                } else {
                    id = s.slotId;
                    title = "SANS TITRE ("+ s.slotId+")";
                    type = "???";
                    kind = "???";
                    speakers = [];
                    summary = "???";
                    track = "???";
                }
            }catch(e){
                console.log(e);
            }
            return {
                id: id,
                title: title,
                type: type,
                kind: kind,
                speakers: speakers,
                fromTime: new Date(s.fromTimeMillis),
                toTime: new Date(s.toTimeMillis),
                roomName: s.roomName,
                __slotId: s.slotId,
                __summary: summary,
                __track: track
            };
        });

        var sortedSchedule = _(schedules).sortBy(function(schedule) { return schedule.fromTime.getTime(); });

        deferred.resolve(sortedSchedule);
    },
    extractEventFromInitialCrawling: function() {
        return this.currentContext.event;
    },
    fetchSpeakerInfosFrom: function(deferred, sp) {
        this.loadQueries++;
        load(sp.__href).then(function(speaker) {
            var voxxrinSpeaker = _.extend({}, sp, {
                'bio':speaker.bio,
                'imageUrl':speaker.avatarURL,
                __twitter: speaker.twitter,
                __firstName: speaker.firstName,
                __lastName: speaker.lastName,
                __company: speaker.company
            });

            deferred.resolve(voxxrinSpeaker);
        }).fail(_.bind(this.onDeferredFailureCallback, {deferred: deferred}));

        return deferred.promise;
    },
    decorateVoxxrinPresentation: function(voxxrinPres, daySchedule) {
        voxxrinPres.fromTime = dateformat(voxxrinPres.fromTime,"yyyy-mm-dd HH:MM:ss.0"),
        voxxrinPres.toTime = dateformat(voxxrinPres.toTime,"yyyy-mm-dd HH:MM:ss.0");
        //voxxrinPres.experience = voxxrinPres.level;

        //delete voxxrinPres.start;
        //delete voxxrinPres.end;

        return false;
    },
    fetchPresentationInfosFrom: function(deferred, s, voxxrinPres) {
        deferred.resolve(_.extend({}, voxxrinPres, {
            'experience': 0,
            'tags': [],
            'summary': s.__summary,
            'track': s.__track
        }));
        return deferred.promise;
    }
});
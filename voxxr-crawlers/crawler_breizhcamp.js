var VoxxrinCrawler = require('./VoxxrinCrawler.js'),
    Q = require('q'),
    _ = require('underscore'),
    load = require("./load.js"),
    md = require('node-markdown').Markdown,
    moment = require('moment-timezone'),
    send = require("./send.js");

module.exports = new VoxxrinCrawler({
    name: 'BreizhCamp',
    prefix: 'bzh',
    logInitialCrawlingResults: function(){
        var schedules = arguments[0];
        console.log("loaded event Breizhcamp, " + schedules.length + " presentations");
    },
    extractScheduleFromInitialCrawling: function(deferred, schedules) {

        var talks = [];
        var talkIds = [];
        var rooms = {
            'Track1': 'Amphi 1',
            'Track2': 'Amphi 2',
            'Track3': 'Amphi 3',
            'Track4': 'Amphi 4',
            'Track5 (labs)': 'Esp. Lab.',
            'Track6': 'Hall'

        }
        try {
            _(schedules).each(function (schedule) {

                var talkId = schedule.id;
                var index = 2;
                while(_.contains(talkIds, talkId)) {
                    talkId = schedule.id+index;
                    index++;
                }

                talkIds.push(talkId);
                var talk = {
                    id: talkId,
                    title: schedule.name,
                    type: schedule.format,
                    kind: "Talk",
                    fromTime: moment.tz(schedule.event_start, "YYYY-MM-DD'T'HH:mm:ss", "Europe/Paris").toDate(),
                    toTime: moment.tz(schedule.event_end, "YYYY-MM-DD'T'HH:mm:ss", "Europe/Paris").toDate(),
                    roomName: rooms[schedule.venue],
                    __summary: md(schedule.description),
                    __track: schedule.venue,
                    speakers: _(schedule.speakers.split(", ")).map(function (speaker) {
                        return {
                            id: speaker,
                            name: speaker
                        };
                    }),
                };
                talks.push(talk);

            });
        }catch(e){
            console.error(e);
        }

        var sortedTalks = _(talks).sortBy(function(talk) { return talk.fromTime.getTime(); });
        deferred.resolve(sortedTalks);
    },
    extractEventFromInitialCrawling: function() {
        return {};
    },
    fetchSpeakerInfosFrom: function(deferred, sp) {
        deferred.resolve(_.extend({}, sp, {
            'bio': '',
            'imageUrl':'',
            __twitter: '',
            __firstName: '',
            __lastName: '',
            __company: ''
        }));

    },
    decorateVoxxrinPresentation: function(voxxrinPres, daySchedule) {
        return false;
    },
    fetchPresentationInfosFrom: function(deferred, s, voxxrinPres) {
        deferred.resolve(_.extend({}, voxxrinPres, {
            'experience': 0,
            'tags': [],
            'summary': s.__summary,
            'track': s.__track
        }));
    }
});

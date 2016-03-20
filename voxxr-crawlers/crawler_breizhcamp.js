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
    extractScheduleFromInitialCrawling: function(deferred, schedules, speakers) {

        var talks = [];
        var talkIds = [];
        var speakersByName = {};
        var rooms = {
            'Track1': 'Amphi A',
            'Track2': 'Amphi B',
            'Track3': 'Amphi C',
            'Track4': 'Amphi D',
            'Track5 (labs)': 'Esp. Lab.',
            'Track6': 'Hall'
        };
        
        try {

            _(speakers).each(function(speaker) {
                var sp = {
                    id: speaker.id,
                    name: speaker.firstname + ' ' + speaker.lastname,
                    bio: speaker.bio,
                    imageUrl: speaker.imageProfilURL,
                    __twitter: speaker.twitter,
                    __firstName: speaker.firstname,
                    __lastName: speaker.lastname,
                    __company: speaker.company
                };
                speakersByName[sp.name] = sp;
            });

            _(schedules).each(function (schedule) {

                var talkId = schedule.id;
                var index = 2;
                while(_.contains(talkIds, talkId)) {
                    talkId = schedule.id+index;
                    index++;
                }

                talkIds.push(talkId);
                
                var speakers = [];
                if (schedule.speakers && schedule.speakers.length > 0) {
                	 speakers = _(schedule.speakers.split(", ")).map(function (speakerName) {
                        return speakersByName[speakerName]
                    });
                }
                
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
                    speakers: speakers,
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
            'bio': sp.bio,
            'imageUrl': sp.imageUrl,
            __twitter: sp.__twitter,
            __firstName: sp.__firstName,
            __lastName: sp.__lastName,
            __company: sp.__company
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

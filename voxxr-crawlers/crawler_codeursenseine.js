var VoxxrinCrawler = require('./VoxxrinCrawler.js'),
    Q = require('q'),
    _ = require('underscore'),
    load = require("./load.js"),
    md = require('node-markdown').Markdown,
    moment = require('moment-timezone'),
    send = require("./send.js");

module.exports = new VoxxrinCrawler({
    name: 'Codeurs en Seine',
    prefix: 'ces',
    logInitialCrawlingResults: function(){
        var schedule = arguments[0];
        var speakers = arguments[1];
        console.log("loaded event Codeurs en Seine, " + speakers.length + " speakers");
    },
    extractScheduleFromInitialCrawling: function(deferred, schedule,speakers) {
        var talks = [];
        var talkIds = [];
        var speakersByTalk = {};

        _(speakers).each(function(speaker) {
            _(speaker.talks).each(function (talk) {
                if (speakersByTalk[talk.id] === undefined) {
                    speakersByTalk[talk.id] = [];
                }
                speakersByTalk[talk.id].push(speaker);
            });
        });
        try {
            var badIdIncrement = -1;
            _(schedule.programme.jours).each(function (day) {
                var dayDateStr = day.date;
                _(day.tracks).each(function (track) {
                    _(track.talks).each(function (talk) {
                        var talkId = talk.id;
                        var kind ="Talk";
                        if (talk.format=="keynote") {
                            kind="Keynote";
                        }
                        var starttime=moment.tz(dayDateStr + " " + talk.time, "DD/MM/YYYY HH:mm", "Europe/Paris").toDate();
                        var endtime=undefined;
                        if (talk.format=="conference") {
                            endtime=moment(starttime).add(50,"m").toDate() ;
                        }
                        if (talk.format=="quickie") {
                            endtime=moment(starttime).add(15,"m").toDate() ;
                        }
                        if (talk.format=="keynote") {
                            endtime=moment(starttime).add(50,"m").toDate() ;
                        }
                        if (talk.format=="break") {
                            endtime=moment(starttime).add(80,"m").toDate() ;
                        }
                        talkIds.push(talkId);
                        var talk = {
                            id: talkId,
                            title: talk.title,
                            type: talk.format,
                            kind: kind,
                            fromTime: starttime,
                            toTime: endtime,
                            roomName: talk.room,
                            __summary: talk.description,
                            __track: track.type
                        };
                        // add speakers

                        if(speakersByTalk[talk.id]) {
                            talk = _.extend(talk, {
                                speakers: _(speakersByTalk[talk.id]).map(function (speaker) {
                                    return {
                                        id: speaker.id,
                                        name: speaker.fullname,
                                        __imageUrl: speaker.avatar,
                                        __links: speaker.liens,
                                        __bio:speaker.description
                                    };
                                })
                            });
                        }
                        talks.push(talk);
                    });
                });
            });
        }catch(e){
            console.error(e);
        }

        var sortedTalks = _(talks).sortBy(function(talk) { return talk.fromTime.getTime(); });
        console.log("extractScheduleFromInitialCrawling #3");
        deferred.resolve(sortedTalks);
    },
    extractEventFromInitialCrawling: function() {
        console.log("extractEventFromInitialCrawling");
        return {};
    },
    fetchSpeakerInfosFrom: function(deferred, sp) {
        console.log("fetchSpeakerInfosFrom");
        deferred.resolve(_.extend({}, sp, {
            'bio': sp.__bio,
            'imageUrl': sp.__imageUrl
        }));
    },
    decorateVoxxrinPresentation: function(voxxrinPres, daySchedule) {
        console.log("decorateVoxxrinPresentation");
        return false;
    },
    fetchPresentationInfosFrom: function(deferred, s, voxxrinPres) {
        console.log("fetchPresentationInfosFrom");
        deferred.resolve(_.extend({}, voxxrinPres, {
            'experience': 0,
            'tags': [],
            'summary': s.__summary,
            'track': s.__track
        }));
    }
});

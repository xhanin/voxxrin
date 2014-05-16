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
        var schedule = arguments[0];
        var talks = arguments[1];
        console.log("loaded event Breizhcamp, " + talks.length + " presentations");
    },
    extractScheduleFromInitialCrawling: function(deferred, schedule, detailedTalks) {
        var detailedTalksById = {};
        _(detailedTalks).each(function(detailedTalk) {
            detailedTalksById[detailedTalk.id] = detailedTalk;
        });

        var talks = [];
        var talkIds = [];
        try {
            var badIdIncrement = -1;
            _(schedule.programme.jours).each(function (day) {
                var dayDateStr = day.date;
                _(day.tracks).each(function (track) {
                    _(track.proposals).each(function (proposal) {
                        var detailedTalk = detailedTalksById[proposal.id];

                        // First weird thing : some talks (like keynote, or some other talks) has id=0
                        // which seems weird to me
                        // I decided to affect a negative incremented id on these special talks in order to make
                        // them appear in the schedule !
                        var talkId = proposal.id === 0 ? badIdIncrement-- : proposal.id;

                        // Second weird thing : on the first day, we have several talks with same id but different
                        // time slots. This makes VoxxrinCrawler crazy, so I decided to create unique ids by appending
                        // "1" to these ids until I find a unique id.
                        while(_.contains(talkIds, talkId)) {
                            talkId = Number("1"+talkId);
                        }
                        talkIds.push(talkId);
                        var talk = {
                            id: talkId,
                            title: proposal.title,
                            type: proposal.format,
                            kind: "Talk",
                            fromTime: moment(dayDateStr + " " + proposal.start, "DD/MM/YYYY HH:mm", "Europe/Paris").toDate(),
                            toTime: moment(dayDateStr + " " + proposal.end, "DD/MM/YYYY HH:mm", "Europe/Paris").toDate(),
                            roomName: proposal.room
                        };
                        // Some talks might not have been detailed (like keynote)
                        if(detailedTalk) {
                            talk = _.extend(talk, {
                                speakers: _(detailedTalk.speakers).map(function (speaker) {
                                    return {
                                        id: speaker.id,
                                        name: speaker.fullname,
                                        bio: "",
                                        imageUrl: speaker.avatar?speaker.avatar.replace("https://", "http://"):null,
                                        "__links": speaker.liens
                                    };
                                }),
                                __summary: md(detailedTalk.description),
                                __track: detailedTalk.track
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
        deferred.resolve(sortedTalks);
    },
    extractEventFromInitialCrawling: function() {
        return {};
    },
    fetchSpeakerInfosFrom: function(deferred, sp) {
        this.loadQueries++;
        deferred.resolve(sp);
        return deferred.promise;
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
        return deferred.promise;
    }
});
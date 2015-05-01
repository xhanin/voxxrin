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

                        var talkId = proposal.id;
                        var index = 2;
                        while(_.contains(talkIds, talkId)) {
                            talkId = proposal.id+index;
                            index++;
                        }
                        
                        talkIds.push(talkId);
                        var talk = {
                            id: talkId,
                            title: proposal.title,
                            type: proposal.format,
                            kind: "Talk",
                            fromTime: moment.tz(dayDateStr + " " + proposal.start, "DD/MM/YYYY HH:mm", "Europe/Paris").toDate(),
                            toTime: moment.tz(dayDateStr + " " + proposal.end, "DD/MM/YYYY HH:mm", "Europe/Paris").toDate(),
                            roomName: proposal.room
                        };
                        // Some talks might not have been detailed (like keynote)
                        if(detailedTalk) {
                            talk = _.extend(talk, {
                                speakers: _(detailedTalk.speakers).map(function (speaker) {
                                	var splittedHref = speaker.href.split("/");
                                    return {
                                        id: splittedHref[splittedHref.length - 1],
                                        name: speaker.fullname,
                                        __href: speaker.href
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

        load(sp.__href).then(function(speaker) {
            var voxxrinSpeaker = _.extend({}, sp, {
                'bio': md(speaker.bio),
                'imageUrl':speaker.avatarURL,
                __twitter: speaker.twitter,
                __firstName: speaker.firstName,
                __lastName: speaker.lastName,
                __company: speaker.company
            });

            deferred.resolve(voxxrinSpeaker);
        }).fail(function() {
            // In case of failure (some 404 happen on some speakers) we're only missing the bio
            // This is reasonable to consider initial speaker info is sufficient
            deferred.resolve(sp);
        });
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

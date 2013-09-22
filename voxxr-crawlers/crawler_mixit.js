var VoxxrinCrawler = require('./VoxxrinCrawler.js'),
    Q = require('q'),
    _ = require('underscore'),
    load = require("./load.js"),
    dateformat = require('dateformat'),
    send = require("./send.js");

module.exports = new VoxxrinCrawler({
    name: 'MixIT',
    prefix: 'mxt',
    events: [
        {
            /* Mix-IT 2013 */
            id: 13,
            /* Hardcoding some event details here, since not provided by REST API */
            from: new Date(Date.parse("2013-04-25T08:30:00.000+02:00")),
            to: new Date(Date.parse("2013-04-26T18:30:00.000+02:00")),
            title: "Mix-IT 2013",
            subtitle: "",
            description: "Java, Agilité, Web, Innovations... Des idées pour tout de suite !",
            location: "SUPINFO Lyon - Lyon"
        }
    ],
    initialCrawlingUrls: function(event) {
        return [
            'http://www.mix-it.fr/api/talks?details=true'
        ];
    },
    logInitialCrawlingResults: function(schedule){
        console.log("loaded event Mix-IT, " + schedule.length + " presentations");
    },
    extractScheduleFromInitialCrawling: function(deferred, schedule) {
        var self = this;
        // Parsing dates and adding "virtual" start and end time for all-day running events
        var sortedSchedule = _(schedule).map(function(s) {
            var override = {};
            if (! s.start) {
                override = {
                    start: new Date(self.currentContext.event.from),
                    end: new Date(self.currentContext.event.to)
                };
            } else {
                override = {
                    start: new Date(Date.parse(s.start)),
                    end: new Date(Date.parse(s.end))
                };
            }
            return _.extend({}, s, override);
        });

        _(sortedSchedule).each(function(s) {
            s.speakers = _(s.speakers).map(function(sp) {
                return {
                    'id': self.options.prefix + sp.id,
                    'name': sp.firstname + " " + sp.lastname,
                    'url': sp.url
                };
            });
            s.type = "Talk";
            s.kind = s.format; delete s.format;
            s.fromTime = s.start;
            s.toTime = s.end;
            s.roomName = s.room || "???";
        });

        var nonCancelledSchedule = _(sortedSchedule).filter(function (s) { return s.toTime; });

        deferred.resolve(nonCancelledSchedule);
    },
    extractEventFromInitialCrawling: function(schedule) {
        var event = this.currentContext.event;
        return {
            'subtitle': event.subtitle,
            'location': event.location
        };
    },
    fetchSpeakerInfosFrom: function(deferred, sp) {
        load(sp.url).then(function(speaker) {
            var voxxrinSpeaker = _.extend({}, sp, {
                'firstName':speaker.firstname,
                'lastName':speaker.lastname,
                'bio': speaker.longdesc.length == 0 ? speaker.shortdesc : speaker.longdesc,
                'imageUrl': speaker.urlimage
            });

            delete voxxrinSpeaker.url;

            deferred.resolve(voxxrinSpeaker);
        }).fail(_.bind(this.onDeferredFailureCallback, {deferred: deferred}));

        return deferred.promise;
    },
    decorateVoxxrinPresentation: function(voxxrinPres, daySchedule) {
        voxxrinPres.fromTime = dateformat(voxxrinPres.fromTime,"yyyy-mm-dd HH:MM:ss.0"),
        voxxrinPres.toTime = dateformat(voxxrinPres.toTime,"yyyy-mm-dd HH:MM:ss.0")
        //voxxrinPres.experience = voxxrinPres.level;

        delete voxxrinPres.start;
        delete voxxrinPres.end;

        return false;
    },
    fetchPresentationInfosFrom: function(deferred, s, voxxrinPres) {
        deferred.resolve(_.extend({}, voxxrinPres, {
            'experience': s.level,
            'tags': _(s.interests).map(function(interest) {
                return {
                    'name': interest.name
                };
            }),
            'summary': s.summary + "\n\n" + s.description
        }));
        return deferred.promise;
    }
});
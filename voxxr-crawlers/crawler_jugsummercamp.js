var VoxxrinCrawler = require('./VoxxrinCrawler.js'),
    Q = require('q'),
    _ = require('underscore'),
    load = require("./load.js"),
    dateformat = require('dateformat'),
    send = require("./send.js");

module.exports = new VoxxrinCrawler({
    name: 'JugSummerCamp',
    prefix: 'jsc',
    logInitialCrawlingResults: function(fetchedEvent){
        console.log("loaded event JugSummerCamp, " + fetchedEvent.presentations.length + " presentations");
    },
    extractScheduleFromInitialCrawling: function(deferred, fetchedEvent) {
        var self = this;
        deferred.resolve(_(fetchedEvent.presentations).map(function(s) {
            // Crappy hack because timestamps in jugsummercamp json file are not in UTC...
            var fromTime = new Date(s['start-date'] - 2*60*60*1000);
            var toTime = new Date(s['end-date'] - 2*60*60*1000);

            return {
                'id': s.id,
                'title': s.title,
                'type': 'Talk',
                'kind': s['type-id'].label,
                'speakers': _(s.speakers).map(function(sp) {
                    return {
                        'id': self.options.prefix + sp.id,
                        'name': sp.name,
                        '__pictureUrl': sp.pictureUrl,
                        '__description': sp.description
                    };
                }),
                'fromTime': new Date(fromTime),
                'toTime': new Date(toTime),
                'roomName': s.place,

                '__summary': s.description
            };
        }));
    },
    extractEventFromInitialCrawling: function(fetchedEvent) {
        return {
            'subtitle': '',
            'location': fetchedEvent.place
        };
    },
    fetchSpeakerInfosFrom: function(deferred, sp) {
        deferred.resolve({
            'id': sp.id,
            'name': sp.name,
            'bio': sp['__description'],
            'imageUrl': sp['__pictureUrl']
        });
    },
    fetchPresentationInfosFrom: function(deferred, s, voxxrinPres) {
        deferred.resolve(_.extend({}, voxxrinPres, {
            'summary': s['__summary']
        }));
    }
});
var VoxxrinCrawler = require('./VoxxrinCrawler.js'),
    Q = require('q'),
    _ = require('underscore'),
    load = require("./load.js"),
    dateformat = require('dateformat'),
    send = require("./send.js");

module.exports = new VoxxrinCrawler({
    name: 'JugSummerCamp',
    prefix: 'jsc',
    events: [
        {
            /* Jugsummercamp 2013 */
            id: 13,
            /* Hardcoding some event details here, since not provided by REST API */
            title: "JugSummerCamp 2013",
            description: "Une journée entière, à l'espace Encan de La Rochelle, pour prendre les dernières nouvelles du monde Java.",
            initialCrawlingUrls: ["http://www.jugsummercamp.com/api/edition/4"]
        }
    ],
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
        var configuredEvent = this.currentContext.event;
        var fromTime = this.currentContext.sortedSchedule[0].fromTime;
        var toTime = this.currentContext.sortedSchedule[this.currentContext.sortedSchedule.length - 1].toTime;

        return {
            'id': this.options.prefix + configuredEvent.id,
            'title': configuredEvent.title,
            'subtitle': '',
            'description': fetchedEvent.description,
            'dates': this.formatDates(fromTime, toTime),
            'from': fromTime,
            'to': toTime,
            'location': fetchedEvent.place,
            'nbPresentations':0,
            'days':[],
            'enabled':true,
            'dayDates': this.calculateDayDates(fromTime, toTime)
        };
    },
    extractRoomsFromInitialCrawling: function(fetchedEvent) {
        var self = this;
        var i=0;
        return _.chain(this.currentContext.sortedSchedule).pluck('roomName').uniq(false).sortBy(function(r) { return r; }).map(function(r) {
           return {
               id: self.event.id + "-" + i++,
               name: r
           };
       }).value();
    },
    fetchSpeakerInfosFrom: function(deferred, sp) {
        deferred.resolve({
            'id': sp.id,
            'name': sp.name,
            'bio': sp['__description'],
            'imageUrl': sp['__pictureUrl']
        });
        return deferred.promise;
    },
    fetchPresentationInfosFrom: function(deferred, s, voxxrinPres) {
        deferred.resolve(_.extend({}, voxxrinPres, {
            'summary': s['__summary']
        }));
        return deferred.promise;
    }
});
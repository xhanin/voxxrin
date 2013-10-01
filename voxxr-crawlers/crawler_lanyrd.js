var VoxxrinCrawler = require('./VoxxrinCrawler.js'),
    Q = require('q'),
    _ = require('underscore'),
    load = require("./load.js"),
    dateformat = require('dateformat'),
    send = require("./send.js"),
    request = require("request"),
    cheerio = require("cheerio");;

module.exports = new VoxxrinCrawler({
    name: 'Lanyrd',
    prefix: 'lrd',
    events: [
        {
            /* Lean Kanban France 2013 */
            id: 'lkbf13',
            /* Hardcoding some event details here, since not provided by REST API */
            title: 'Lean Kanban France 2013',
            domainUrl: 'http://lanyrd.com',
            baseUrl: 'http://lanyrd.com/2013/lean-kanban-france/'
        }
    ],
    initialCrawlingUrls: function(event) {
        return [
            event.baseUrl,
            event.baseUrl+"schedule/"
        ];
    },
    initialUrlParsingCallback: function(url) {
        var deferred = Q.defer();
        request({uri:url}, function(error,response,body){
            deferred.resolve(body);
        });
        return deferred.promise;
    },
    logInitialCrawlingResults: function(baseUrlBody, scheduleBody){
        console.log("loaded event "+this.currentContext.event.title);
    },
    extractScheduleFromInitialCrawling: function(deferred, baseUrlBody, scheduleBody) {
        var self = this;

        self.currentContext.$ = cheerio.load(scheduleBody);
        var $ = self.currentContext.$;

        var speakersDeferred = [];
        var schedules = $(".schedule-item").map(function(i) {
            // Crappy hack because timestamps in jugsummercamp json file are not in UTC...
            var $el = $(this);
            var fromTimeVal = $el.find('.dtstart .value-title').attr("title");
            var toTimeVal = $el.find('.dtend .value-title').attr("title");
            var schedule = {
                'id': i,
                'title': $el.find("h2 a").text(),
                'type': 'Talk',
                'kind': 'Conference',
                // Will be done.. later (see below)
                'speakers': [],
                'fromTime': new Date(Date.parse(fromTimeVal.substr(0, fromTimeVal.indexOf("+")))),
                'toTime': new Date(Date.parse(toTimeVal.substr(0, toTimeVal.indexOf("+")))),
                'roomName': $el.find('.schedule-meta p').filter(function(){ return $(this).find("strong").text() === "In"; }).first().text().replace(/[\s\S]* - ([^(]*)(\(.*\))?,[\s\S]*.*/, "$1").trim(),

                '__summary': $el.find('div.desc').text()
            };

            var prezUrl = self.currentContext.event.domainUrl + $el.find('h2 a').attr('href');

            var speakerDeferred = Q.defer();
            speakersDeferred.push(speakerDeferred.promise);
            request({uri:prezUrl}, function(error,response,speakerPageBody){
                var $ = cheerio.load(speakerPageBody);

                schedule.speakers = $('div.primary div.mini-profile').map(function(){
                    var $el = $(this);
                    var speakerProfileUrl = $el.find('.name a').attr('href').replace(/\/$/, "")
                    try {
                        return {
                            'id': self.options.prefix + '-' + speakerProfileUrl.substring(speakerProfileUrl.lastIndexOf('/')).replace(/^\//, "").replace("_","-"),
                            'name': $el.find('.name a').text(),
                            'bio': $el.find('div.profile-longdesc p').text(),
                            '__pictureUrl': $el.find('div.avatar a img').attr('src')
                        };
                    }catch(e){
                        console.error(e);
                    }
                });

                speakerDeferred.resolve(schedule.speakers);
            });

            return schedule;
        });
        Q.all(speakersDeferred).spread(function(){
            deferred.resolve(schedules);
        });
    },
    extractEventFromInitialCrawling: function(baseUrlBody, scheduleBody) {
        var $ = cheerio.load(baseUrlBody);
        var $venues = $('#venues');
        return {
            'subtitle': '',
            'description': $('.tagline').text(),
            'location': $venues.find('h3 a').text() + ', ' + $venues.find('.primary-place a').eq(2).text() + ', ' + $venues.find('.primary-place a').eq(1).text()
        };
    },
    fetchSpeakerInfosFrom: function(deferred, sp) {
        deferred.resolve({
            'id': sp.id,
            'name': sp.name,
            'bio': sp.bio,
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
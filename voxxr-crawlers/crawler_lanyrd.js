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
    getPrefix: function(self){
        return self.currentContext.event.prefix;
    },
    initialCrawlingUrls: function(event) {
        var crawlingUrls = [
            event.baseUrl,
            event.baseUrl+"schedule/"
        ];

        if(event.schedulePagesCount) {
            _.each(_.range(2, event.schedulePagesCount+1), function(pageIdx){
                crawlingUrls.push(event.baseUrl+"schedule/?page="+pageIdx);
            });
        }

        return crawlingUrls;
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
    extractScheduleFromInitialCrawling: function() {
        var deferred = arguments[0];
        var baseUrlBody = arguments[1];
        var scheduleBodies = Array.prototype.slice.call(arguments, 2, arguments.length);

        var self = this, speakersDeferred = [], schedules = [], scheduleId=0;
        _.each(scheduleBodies, function(scheduleBody){
            var $ = cheerio.load(scheduleBody);
            Array.prototype.push.apply(schedules, $(".schedule-item").map(function() {
                var $el = $(this);
                var fromTimeValStr = $el.find('.dtstart .value-title').attr("title");
                var toTimeValStr = $el.find('.dtend .value-title').attr("title");

                var fromTime = new Date(Date.parse(fromTimeValStr.substr(0, fromTimeValStr.indexOf("+"))));
                var toTime = new Date(Date.parse(toTimeValStr.substr(0, toTimeValStr.indexOf("+"))));

                // Subtracting timezone offset because time string is displayed in current timezone and we want to store
                // it as plain UTC timestamp
                fromTime = new Date(fromTime.getTime() + fromTime.getTimezoneOffset()*60*1000);
                toTime = new Date(toTime.getTime() + toTime.getTimezoneOffset()*60*1000);

                var roomName = $el.find('.schedule-meta p').filter(function () {
                    return $(this).find("strong").text() === "In";
                }).first().text().replace(/[\s\S]* - ([^(]*)(\(.*\))?,[\s\S]*.*/, "$1").trim();

                if(self.currentContext.event.roomNameTransformer){
                    roomName = self.currentContext.event.roomNameTransformer(roomName);
                }

                var schedule = {
                    'id': scheduleId++,
                    'title': $el.find("h2 a").text(),
                    'type': 'Talk',
                    'kind': 'Conference',
                    // Will be done.. later (see below)
                    'speakers': [],
                    'fromTime': fromTime,
                    'toTime': toTime,
                    'roomName': roomName,

                    '__summary': $el.find('div.desc').text()
                };

                var prezUrl = self.currentContext.event.domainUrl + $el.find('h2 a').attr('href');

                var speakerDeferred = Q.defer();
                speakersDeferred.push(speakerDeferred.promise);
                request({uri:prezUrl}, function(error,response,speakerPageBody){
                    var $ = cheerio.load(speakerPageBody);

                    schedule.speakers = $('div.primary div.mini-profile').map(function(){
                        var $el = $(this);
                        var speakerName, userId;
                        var $speakerName = $el.find('.name');
                        if($speakerName.find("a").length) {
                            speakerName = $speakerName.find("a").text();

                            var speakerProfileUrl = $speakerName.find("a").attr('href').replace(/\/$/, "");
                            userId = speakerProfileUrl.substring(speakerProfileUrl.lastIndexOf('/')).replace(/^\//, "").replace(/_/g, "-");
                        } else {
                            speakerName = $speakerName.text();
                            userId = speakerName.toLowerCase().replace(/\s/, "");
                        }

                        var speakerDesc = $el.find('.profile-longdesc').text()==""?$el.find('.profile-desc').text():$el.find('.profile-longdesc').text();
                        try {
                            return {
                                'id': self.options.prefix + '-' + userId,
                                'name': speakerName,
                                'bio': speakerDesc,
                                '__pictureUrl': $el.find('div.avatar a img').attr('src')
                            };
                        }catch(e){
                            console.error(e);
                        }
                    });

                    speakerDeferred.resolve(schedule.speakers);
                });

                return schedule;
            }));
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
    },
    fetchPresentationInfosFrom: function(deferred, s, voxxrinPres) {
        deferred.resolve(_.extend({}, voxxrinPres, {
            'summary': s['__summary']
        }, this.currentContext.event.presentationUpdater?this.currentContext.event.presentationUpdater(voxxrinPres):{}));
    }
});

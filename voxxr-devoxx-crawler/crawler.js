var http = require("http"),
    Q = require('q'),
    _ = require('underscore'),
    dateformat = require('dateformat'),
    load = require("./load.js"),
    send = require("./send.js"),
    request = require('request'),
    token = require('./authorizationToken')
    ;

var baseUrl = 'http://app.voxxr.in';

var voxxrin = {
    event: {},
    rooms: {},
    daySchedules: {}
};

var devoxx = function() {
    var prefix = 'dvx';
    var eventIds = [ 8 /* devoxx fr */, 9 /* devoxx UK */ ];

    function toVoxxrinSpeaker(sp) {
        var id = sp.speakerUri.substring(sp.speakerUri.lastIndexOf('/') + 1);
        var voxxrinSpeakerHeader = {"id":prefix + id, "name":sp.speaker,
            "uri":"/events/" + voxxrin.event.id + "/speakers/" + prefix + id
        };
        load(sp.speakerUri).then(function(speaker) {
            var voxxrinSpeaker = _.extend(voxxrinSpeakerHeader, {
                "firstName":speaker.firstName,
                "lastName":speaker.lastName,
                "pictureURI":"/events/" + voxxrin.event.id + "/speakers/" + prefix + id + "/picture" + (speaker.imageURI.substring(speaker.imageURI.lastIndexOf('.'))),
                "bio":speaker.bio
            });
            send(baseUrl + '/r' + voxxrinSpeaker.uri,
                    voxxrinSpeaker)
                .then(function() {console.log('SPEAKER: ', voxxrinSpeaker.id, voxxrinSpeaker.name)})
                .fail(onFailure);
            request.get(speaker.imageURI).pipe(request.put({
                url: baseUrl + '/r' + voxxrinSpeaker.pictureURI,
                headers: {
                    'Authorization':token
                }
            }));
        }).fail(onFailure);
        return voxxrinSpeakerHeader;
    }

    function crawl_devoxx(eventId) {
        console.log('start crawling on Devoxx (event ' + eventId + ')');
        Q.all([
            load('http://cfp.devoxx.com/rest/v1/events/' + eventId),
            load('http://cfp.devoxx.com/rest/v1/events/' + eventId + '/schedule/rooms'),
            load('http://cfp.devoxx.com/rest/v1/events/' + eventId + '/schedule')
        ]).spread(function(event, rooms, schedule) {
            console.log("loaded event " + event.id + ", " + schedule.length
                + " presentations and " + rooms.length + " rooms");

            schedule = _(schedule).sortBy(function(s) {return s.fromTime});
            // filtering events like breakfasts which hasn't any presentationUri
            schedule = _(schedule).filter(function(s) { return s.presentationUri });

            var from = new Date(Date.parse(event.from)),
                to = new Date(Date.parse(event.to));

            var fromTime = from, toTime = to;
            if (schedule.length) {
                fromTime = schedule[0].fromTime;
                toTime = _(schedule).sortBy(function(s) {return s.toTime})[schedule.length - 1].toTime;
            }

            voxxrin.event = {
                "id": prefix + event.id,
                "title":event.name,"subtitle":"","description":event.description,
                "dates": formatDates(from, to),
                "from": fromTime,
                "to": toTime,
                "location":event.location, "nbPresentations":0,
                "days":[],
                "enabled":true
            };
            _(rooms).each(function(r) {
                var room = voxxrin.rooms[r.name] = {"id":voxxrin.event.id + "-" + r.id, "name": r.name,
                    "uri": "/rooms/" + voxxrin.event.id + "-" + r.id};
                send(baseUrl + '/r' + room.uri, room).then(function() {
                    console.log('ROOM:', room);
                }).fail(onFailure);
            });
            var day, i;
            for (day = from, i=0; day <= to; day.setDate(day.getDate() + 1), i++) {
                voxxrin.event.days.push(
                    {"id":prefix + event.id + '-' + i,
                        "name": dateformat(day, 'mmm dd'),
                        "uri": "/events/" + (prefix + event.id) + "/day/" + prefix + event.id + '-' + i,
                        "nbPresentations":0});
                voxxrin.daySchedules[dateformat(day, 'yyyy-mm-dd')] =
                    {"id":prefix + event.id + '-' + i, "dayNumber": i, "schedule":[]};
            }
            _(schedule).each(function(s, i) {
                voxxrin.event.nbPresentations++;
                var fromTime = new Date(Date.parse(s.fromTime)),
                    daySchedule = voxxrin.daySchedules[dateformat(fromTime, 'yyyy-mm-dd')];

                var voxxrinPres = {"id":prefix + s.id, "title":s.title, "type":s.type, "kind":s.kind,
                        "previousId": prefix + schedule[(i-1+schedule.length)%schedule.length].id,
                        "nextId": prefix + schedule[(i+1)%schedule.length].id,
                        "dayId": daySchedule.id,
                        "uri":"/events/" + voxxrin.event.id + "/presentations/" + prefix + s.id,
                        "speakers": _(s.speakers).map(toVoxxrinSpeaker),
                        "room": voxxrin.rooms[s.room],
                        "slot": dateformat(fromTime, fromTime.getMinutes() ? 'h:MMtt' : 'htt'), "fromTime":s.fromTime,"toTime":s.toTime};

                if (voxxrinPres.id === 'dvx655') {
                    // very special case for Voxxrin presentation at devoxxFR:
                    // force the room id to a separate room because I prefer to use a dedicated server
                    // for this first presentation
                    voxxrinPres.room = {"id":"1", "name": "La Seine C", "uri": "/rooms/1"};
                    send(baseUrl + '/r' + voxxrinPres.room.uri, voxxrinPres.room).then(function() {
                        console.log('ROOM:', voxxrinPres.room);
                    }).fail(onFailure);
                }

                if (_(daySchedule.schedule).find(function(p) { return p.id === voxxrinPres.id })) {
                    // workaround bug in CFP API having multiple times the same pres
                    return;
                }
                voxxrin.event.days[daySchedule.dayNumber].nbPresentations++;
                daySchedule.schedule.push(voxxrinPres);
                load(s.presentationUri).then(function(p) {
                    send(baseUrl + '/r' + voxxrinPres.uri,
                        _.extend(voxxrinPres, {
                            "track":p.track,
                            "experience":p.experience,
                            "tags":p.tags,
                            "summary":p.summary + "/n" + p.description
                        }))
                        .then(function() {console.log('PRESENTATION: ', voxxrinPres.title, daySchedule.id, voxxrinPres.slot)})
                        .fail(onFailure);
                }).fail(onFailure);
            });

            send(baseUrl + '/r/events', voxxrin.event).then(function() {
                console.log('EVENT:', voxxrin.event);
            }).fail(onFailure);
            _(voxxrin.daySchedules).each(function (ds) {
                send(baseUrl + '/r/events/' + voxxrin.event.id + '/day/' + ds.id, ds).then(function(){
                    console.log('DAY SCHEDULE:', ds.id, ' LENGTH:', ds.schedule.length);
                }).fail(onFailure);
            });
        }).fail(onFailure);
    }

    return {
        crawl: function() {
            _(eventIds).each(function(id) {
                crawl_devoxx(id);
            });
        }
    }
}();

var mixit = function() {
    var prefix = 'mxt';
    //var eventIds: [ 13 /* Mix-IT 3013 */ ];

    function toVoxxrinSpeaker(sp) {
        var id = prefix + sp.id;
        var voxxrinSpeakerHeader = {"id": id, "name":sp.firstname + " " + sp.lastname,
            "uri":"/events/" + voxxrin.event.id + "/speakers/" + id
        };
        load(sp.url).then(function(speaker) {
            var voxxrinSpeaker = _.extend(voxxrinSpeakerHeader, {
                "firstName":speaker.firstname,
                "lastName":speaker.lastname,
                "pictureURI":"/events/" + voxxrin.event.id + "/speakers/" + id + "/picture.png",
                "bio": speaker.longdesc.length == 0 ? speaker.shortdesc : speaker.longdesc
            });
            send(baseUrl + '/r' + voxxrinSpeaker.uri, voxxrinSpeaker)
                .then(function() {console.log('SPEAKER: ', voxxrinSpeaker.id, voxxrinSpeaker.name)})
                .fail(onFailure);
            request.get(speaker.urlimage).pipe(request.put({
                url: baseUrl + '/r' + voxxrinSpeaker.pictureURI,
                headers: {
                    'Authorization':token
                }
            }));
        }).fail(onFailure);
        return voxxrinSpeakerHeader;
    }

    function crawl_mixit() {
        console.log('start crawling Mix-IT');
        var id = prefix + "13";
        Q.all([
            load('http://www.mix-it.fr/api/talks?details=true')
        ]).spread(function(schedule) {
            console.log("loaded event Mix-IT, " + schedule.length + " presentations");
            var from = new Date(Date.parse("2013-04-25T08:30:00.000+02:00")),
                to = new Date(Date.parse("2013-04-26T18:30:00.000+02:00"));
            // Parsing dates and adding "virtual" start and end time for all-day running events
            _(schedule).each(function(s) {
                if (! s.start) {
                    s.start = new Date(from);
                    s.end = new Date(to);
                } else {
                    s.start = new Date(Date.parse(s.start));
                    s.end = new Date(Date.parse(s.end));
                }
            });
            schedule = _(schedule).sortBy(function(s) { return s.start; });
            var fromTime = from, toTime = to;
            if (schedule.length) {
                fromTime = schedule[0].start;
                toTime = _(schedule).sortBy(function(s) {return s.end})[schedule.length - 1].end;
            }
            voxxrin.event = {
                "id": id,
                "title":"Mix-IT 2013","subtitle":"","description":"Java, Agilité, Web, Innovations... Des idées pour tout de suite !",
                "dates": formatDates(from, to),
                "from": fromTime,
                "to": toTime,
                "location":"SUPINFO Lyon - Lyon", "nbPresentations":0,
                "days":[],
                "enabled":true
            };
            var i = 0;
            var rooms = _.chain(schedule).map(function(s) {
                if (! s.room) {
                    return "???";
                }
                return s.room;
            }).uniq(false).sortBy(function(r) { return r; }).map(function(r) {
                return {
                    id: i++,
                    name: r
                };
            }).value();
            _(rooms).each(function(r) {
                var room = voxxrin.rooms[r] = {"id":voxxrin.event.id + "-" + r.id, "name": r.name,
                    "uri": "/rooms/" + voxxrin.event.id + "-" + r.id};
                send(baseUrl + '/r' + room.uri, room).then(function() {
                    console.log('ROOM:', room);
                }).fail(onFailure);
            });
            var day;
            for (day = from, i=0; day <= to; day.setDate(day.getDate() + 1), i++) {
                voxxrin.event.days.push(
                    {"id":id + '-' + i,
                        "name": dateformat(day, 'mmm dd'),
                        "uri": "/events/" + id + "/day/" + id + '-' + i,
                        "nbPresentations":0});
                voxxrin.daySchedules[dateformat(day, 'yyyy-mm-dd')] =
                    {"id":id + '-' + i, "dayNumber": i, "schedule":[]};
            }
            _(schedule).each(function(s, i) {
                voxxrin.event.nbPresentations++;
                var fromTime = new Date(Date.parse(s.start)),
                    daySchedule = voxxrin.daySchedules[dateformat(fromTime, 'yyyy-mm-dd')];

                var voxxrinPres = {"id":prefix + s.id, "title":s.title, "type":"Talk", "kind":s.format,
                        "previousId": prefix + schedule[(i-1+schedule.length)%schedule.length].id,
                        "nextId": prefix + schedule[(i+1)%schedule.length].id,
                        "dayId": daySchedule.id,
                        "uri":"/events/" + voxxrin.event.id + "/presentations/" + prefix + s.id,
                        "speakers": _(s.speakers).map(toVoxxrinSpeaker),
                        "room": voxxrin.rooms[s.room],
                        "slot": dateformat(fromTime, fromTime.getMinutes() ? 'h:MMtt' : 'htt'), "fromTime":s.fromTime,"toTime":s.toTime};
                voxxrin.event.days[daySchedule.dayNumber].nbPresentations++;
                daySchedule.schedule.push(voxxrinPres);
                send(baseUrl + '/r' + voxxrinPres.uri,
                    _.extend(voxxrinPres, {
                        "experience":s.level,
                        "tags":_(s.interests).map(function(interest) {
                            return {
                                "name": interest.name
                            };
                        }),
                        "summary":s.summary
                    }))
                    .then(function() {console.log('PRESENTATION: ', voxxrinPres.title, daySchedule.id, voxxrinPres.slot)})
                    .fail(onFailure);
            });

            send(baseUrl + '/r/events', voxxrin.event).then(function() {
                console.log('EVENT:', voxxrin.event);
            }).fail(onFailure);
            _(voxxrin.daySchedules).each(function (ds) {
                send(baseUrl + '/r/events/' + voxxrin.event.id + '/day/' + ds.id, ds).then(function(){
                    console.log('DAY SCHEDULE:', ds.id, ' LENGTH:', ds.schedule.length);
                }).fail(onFailure);
            });
        }).fail(onFailure);
    }

    return {
        crawl: crawl_mixit
    };
}();

var events = [devoxx, mixit];

function formatDates(from, to) {
    if (from === to) {
        return dateformat(from, 'mmm dd, yyyy');
    } else if (from.getMonth() === to.getMonth()) {
        return dateformat(from, 'mmm') + ' '
            + from.getDate() + '-' + to.getDate()
            + ', ' + dateformat(from, 'yyyy');
    } else if (from.getYear() === to.getYear()) {
        return dateformat(from, 'mmm dd') + ' - '
            + dateformat(to, 'mmm dd, yyyy');
    } else {
        return dateformat(from, 'mmm dd, yyyy') + ' - ' + dateformat(to, 'mmm dd, yyyy');
    }
}

function onFailure(err) {
    console.log('ERROR', err);
}

var port = process.env.PORT || 3000;
http.createServer(function(req, response) {
    response.writeHead(200, {"Content-Type": "text/plain"});
    if (req.method === 'POST') {
        _(events).each(function(evt) {
            evt.crawl();
        });
        response.write("Started crawling...");
    } else {
        response.write("Ready...");
    }
    response.end();
}).listen(port);

console.log('server ready on http://localhost:' + port + '/');
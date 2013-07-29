var http = require("http"),
    Q = require('q'),
    _ = require('underscore'),
    url = require('url'),
    dateformat = require('dateformat'),
    load = require("./load.js"),
    send = require("./send.js"),
    request = require('request'),
    token = require('./authorizationToken'),
    md = require("node-markdown").Markdown
    ;

var PROD_BASE_URL = 'http://app.voxxr.in';
var DEV_BASE_URL = 'http://localhost:8080';

var voxxrin = {
    event: {},
    rooms: {},
    daySchedules: {}
};

var devoxx = function() {
    var prefix = 'dvx';
    var eventIds = [ 8 /* devoxx fr */, 9 /* devoxx UK */ ];

    function toVoxxrinSpeaker(baseUrl, sp) {
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

    function crawl_devoxx(baseUrl, eventId) {
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
                        "speakers": _(s.speakers).map(function(sp){ return toVoxxrinSpeaker(baseUrl, sp); }),
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
                            "summary":p.summary
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
        crawl: function(baseUrl) {
            _(eventIds).each(function(id) {
                crawl_devoxx(baseUrl, id);
            });
        }
    }
}();

var mixit = function() {
    var prefix = 'mxt';
    var events = [
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
    ];

    function toVoxxrinSpeaker(baseUrl, sp) {
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

    function crawl_mixit(baseUrl, event) {
        console.log('start crawling Mix-IT');
        var id = prefix + event.id;
        Q.all([
            load('http://www.mix-it.fr/api/talks?details=true')
        ]).spread(function(schedule) {
            console.log("loaded event Mix-IT, " + schedule.length + " presentations");
            var from = event.from,
                to = event.to;
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
                "title": event.title,
                "subtitle": event.subtitle,
                "description": event.description,
                "dates": formatDates(from, to),
                "from": fromTime,
                "to": toTime,
                "location": event.location,
                "nbPresentations":0,
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
                var room = voxxrin.rooms[r.name] = {"id":voxxrin.event.id + "-" + r.id, "name": r.name,
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
                        "speakers": _(s.speakers).map(function(sp){ return toVoxxrinSpeaker(baseUrl, sp); }),
                        "room": voxxrin.rooms[s.room ? s.room : "???"],
                        "slot": dateformat(fromTime, fromTime.getMinutes() ? 'h:MMtt' : 'htt'),
                        "fromTime":dateformat(s.start,"yyyy-mm-dd HH:MM:ss.0"),
                        "toTime":dateformat(s.end,"yyyy-mm-dd HH:MM:ss.0")
                    };
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
                        "summary":s.summary + "\n\n" + s.description
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
        crawl: function(baseUrl) {
            _(events).each(function(event) {
                crawl_mixit(baseUrl, event);
            });
        }
    };
}();



var breizhcamp = function() {
    var prefix = 'bzh';
    var eventId = 13;

    var creneaux = {
        "universite": {
            title: 'Université',
            duree: 180
        },
        "quickie": {
            title: 'Quickie',
            duree: 15
        },
        "hands-on": {
            title: 'Hands-on',
            duree: 180
        },
        "tools in action": {
            title: 'Tools in action',
            duree: 30
        },
        "conference": {
            title: 'Conférence',
            duree: 60
        },
        "lab": {
            title: 'Lab',
            duree: 60
        },
        "biglab": {
            title: 'Lab',
            duree: 120
        },
        "keynote": {
            title: 'Keynote',
            duree: 30
        }
    };

    function toVoxxrinSpeaker(baseUrl, speaker) {
        var id = prefix + speaker.id;

        // Optim gravatar
        if (speaker.avatar && speaker.avatar.indexOf("gravatar") !== -1) {
            speaker.avatar = speaker.avatar + "&s=200";
        }
        // Optim twitter
        if (speaker.avatar && speaker.avatar.indexOf("twimg") !== -1) {
            if (speaker.avatar.indexOf("_normal") !== -1) {
                speaker.avatar = speaker.avatar.replace("_normal", "");
            }
        }

        var voxxrinSpeaker =
        {
            "id": id,
            "name": speaker.fullname,
            "uri": "/events/" + voxxrin.event.id + "/speakers/" + id
        };

        var pictureURI = "/events/" + voxxrin.event.id + "/speakers/" + id + "/picture.png";


        request.get(speaker.avatar).pipe(request.put({
            url: baseUrl + '/r' + pictureURI,
            headers: {
                'Authorization':token
            }
        }));

        if (!speaker.description) {
            speaker.description = "";
        }

        send(baseUrl + '/r' + voxxrinSpeaker.uri, _.extend(voxxrinSpeaker, {
            "pictureURI":pictureURI,
            "bio": md(speaker.description)
        }))
            .then(function () {
                console.log('SPEAKER: ', voxxrinSpeaker.id, voxxrinSpeaker.name)
            })
            .fail(onFailure);
        return voxxrinSpeaker;
    }

    function crawl_breizhcamp(baseUrl) {
        console.log('start crawling Beizhcamp');
        Q.all([
                load('http://cfp.breizhcamp.org/programme'),
                load('http://cfp.breizhcamp.org/accepted/speakers')
            ]).spread(function(programme, speakers) {
                console.log(baseUrl);
                console.log("Loading breizhcamp programme");
                var from = undefined;
                var to = undefined;
                var jourFrom = undefined;
                var jourTo = undefined;
                var fromTime = undefined;
                var toTime = undefined;

                var speakersByTalk = {};

                _(speakers).each(function(speaker) {
                    _(speaker.talks).each(function (talk) {
                        if (speakersByTalk[talk.id] === undefined) {
                            speakersByTalk[talk.id] = [];
                        }
                        speakersByTalk[talk.id].push(speaker);
                    });
                });

                var rooms = [];

                _(programme.programme.jours).each(function (jour){
                    if (from === undefined || from > jour.date) {
                        from = jour.date;
                        jourFrom = jour;
                    }
                    if (to == undefined || to < jour.date) {
                        to = jour.date;
                        jourTo = jour;
                    }

                    _(jour.tracks).each(function(track) {
                        _(track.talks).each(function(talk) {
                            if (talk.time.length < 5) {
                                talk.time = '0' + talk.time;
                            }
                            var hour = parseInt(talk.time.split(":")[0]);
                            var minute = parseInt(talk.time.split(":")[1]);
                            minute += creneaux[talk.format].duree;
                            while (minute >= 60) {
                                hour += 1;
                                minute -= 60;
                            }
                            if (minute < 10) {
                                minute = "0" + minute;
                            }
                            if (hour < 10) {
                                hour = "0" + hour;
                            }
                            talk.endTime = "" + hour + ":" + minute;

                            if (! talk.room) {
                                talk.room = "TBD";
                            }

                            rooms.push(talk.room);
                        });
                    });
                });

                _(jourFrom.tracks).each(function(track){
                    _(track.talks).each(function(talk) {
                        if (fromTime === undefined || fromTime > talk.time) {
                            fromTime = talk.time;
                        }
                    });
                });

                _(jourTo.tracks).each(function(track) {
                    _(track.talks).each(function(talk) {
                        if (toTime === undefined || toTime < talk.endTime) {
                            toTime = talk.endTime;
                        }
                    })
                });

                fromTime = from.split("/")[2] + "-"
                    + from.split("/")[1] + "-"
                    + from.split("/")[0] + " "
                    + fromTime.split(":")[0] + ":"
                    + fromTime.split(":")[1] + ":00.0";
                toTime = to.split("/")[2] + "-"
                    + to.split("/")[1] + "-"
                    + to.split("/")[0] + " "
                    + toTime.split(':')[0] + ":"
                    + toTime.split(':')[1] + ":00.0";
                from = new Date(
                    from.split("/")[2],
                    parseInt(from.split("/")[1]) - 1,
                    from.split("/")[0]);
                to = new Date(
                    to.split("/")[2],
                    parseInt(to.split("/")[1]) - 1,
                    to.split("/")[0]);

                voxxrin.event = {
                    "id": prefix + eventId,
                    "title":"Breizhcamp 2013",
                    "subtitle":"",
                    "description":"",
                    "dates": formatDates(from, to),
                    "from": fromTime,
                    "to": toTime,
                    "location":"IFSIC", "nbPresentations":0,
                    "days":[],
                    "enabled":true
                };


                var i = 0;
                rooms = _.chain(rooms).uniq(false)
                    .sortBy(function(room) {
                        return room;
                    }).map(function(room) {
                        return {
                            id: i++,
                            name: room
                        };
                    }).value();


                _(rooms).each(function(r) {
                    var room = voxxrin.rooms[r.name] = {"id":voxxrin.event.id + "-" + r.id, "name": r.name,
                        "uri": "/rooms/" + voxxrin.event.id + "-" + r.id};
                    send(baseUrl + '/r' + room.uri, room).then(function() {
                        console.log('ROOM:', room);
                    }).fail(onFailure);
                });

                var indexJour = 0;

                _(programme.programme.jours).each(function(jour) {

                    var day = new Date(
                        jour.date.split("/")[2],
                        parseInt(jour.date.split("/")[1]) -1,
                        jour.date.split("/")[0]);

                    voxxrin.event.days.push(
                        {"id": eventId + '-' + indexJour,
                            "name": dateformat(day, 'mmm dd'),
                            "uri": "/events/" + eventId + "/day/" + eventId + '-' + indexJour,
                            "nbPresentations": 0});
                    voxxrin.daySchedules[jour.date.split("/")[2] + "-"
                        + jour.date.split("/")[1] + "-"
                        + jour.date.split("/")[0]] = {
                        "id": eventId + '-' + indexJour,
                        "dayNumber": indexJour,
                        "schedule": []};

                    indexJour++
                });


                _(programme.programme.jours).each(function(jour) {
                    _(jour.tracks).each(function(track) {
                        _(track.talks).each(function(talk) {
                            voxxrin.event.nbPresentations++;

                            var fromTime = jour.date.split("/")[2] + "-"
                                + jour.date.split("/")[1] + "-"
                                + jour.date.split("/")[0] + " "
                                + talk.time.split(":")[0] + ":"
                                + talk.time.split(":")[1] + ":00.0";

                            var endTime = jour.date.split("/")[2] + "-"
                                + jour.date.split("/")[1] + "-"
                                + jour.date.split("/")[0] + " "
                                + talk.endTime.split(":")[0] + ":"
                                + talk.endTime.split(":")[1] + ":00.0";
                            var daySchedule = voxxrin.daySchedules[jour.date.split("/")[2] + "-"
                                + jour.date.split("/")[1] + "-"
                                + jour.date.split("/")[0]];

                            var voxxrinPres =
                            {
                                "id":prefix + talk.id,
                                "title":talk.title,
                                "type":"Talk",
                                "kind":talk.format,
                                "previousId": null, // TODO : add previous/next logic
                                "nextId": null, // TODO : add previous/next logic
                                "dayId": daySchedule.id,
                                "uri":"/events/" + voxxrin.event.id + "/presentations/" + prefix + talk.id,
                                "room": voxxrin.rooms[talk.room],
                                "slot": talk.time,
                                "fromTime":fromTime,
                                "toTime":endTime,
                                "speakers":  _(speakersByTalk[talk.id]).map(function(sp){ return toVoxxrinSpeaker(baseUrl, sp); })
                            };

                            if (talk.id !== undefined) {
                                if (!talk.description) {
                                    talk.description = "";
                                }
                                load("http://cfp.breizhcamp.org/accepted/talk/" + talk.id).then(function(talkDetail) {
                                    send(baseUrl + '/r' + voxxrinPres.uri, _.extend(voxxrinPres,
                                        {
                                            "tags":talkDetail.tags,
                                            "summary":md(talkDetail.description)
                                        })).then(function () {
                                            console.log('PRESENTATION: ', voxxrinPres.title, daySchedule.id, voxxrinPres.slot)
                                        }).fail(onFailure);
                                });
                            } else {
                                send(baseUrl + '/r' + voxxrinPres.uri, voxxrinPres).then(function () {
                                        console.log('PRESENTATION: ', voxxrinPres.title, daySchedule.id, voxxrinPres.slot)
                                    }).fail(onFailure);
                            }



                            voxxrin.event.days[daySchedule.dayNumber].nbPresentations++;
                            daySchedule.schedule.push(voxxrinPres);

                        });
                    });
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
        crawl: function(baseUrl) {
            crawl_breizhcamp(baseUrl);
        }
    };
}();



var codeursenseine = function() {
    var prefix = 'ces';
    var eventId = '761';

    var creneaux = {
        "keynote": {
            title: 'Keynote',
            duree: 70
        },
        "break": {
            title: 'Buffet',
            duree: 60
        },
        "conference": {
            title: 'Conférence',
            duree: 50
        }
    };

    function toVoxxrinSpeaker(baseUrl, speaker) {
        var id = prefix + speaker.id;

        // Optim gravatar
        if (speaker.avatar && speaker.avatar.indexOf("gravatar") !== -1) {
            speaker.avatar = speaker.avatar + "&s=200";
        }
        // Optim twitter
        if (speaker.avatar && speaker.avatar.indexOf("twimg") !== -1) {
            if (speaker.avatar.indexOf("_normal") !== -1) {
                speaker.avatar = speaker.avatar.replace("_normal", "");
            }
        }

        var voxxrinSpeaker =
        {
            "id": id,
            "name": speaker.fullname,
            "uri": "/events/" + voxxrin.event.id + "/speakers/" + id
        };

        var pictureURI = "/events/" + voxxrin.event.id + "/speakers/" + id + "/picture.png";


        request.get(speaker.avatar).pipe(request.put({
            url: baseUrl + '/r' + pictureURI,
            headers: {
                'Authorization':token
            }
        }));

        if (!speaker.description) {
            speaker.description = "";
        }

        send(baseUrl + '/r' + voxxrinSpeaker.uri, _.extend(voxxrinSpeaker, {
            "pictureURI":pictureURI,
            "bio": md(speaker.description)
        }))
            .then(function () {
                console.log('SPEAKER: ', voxxrinSpeaker.id, voxxrinSpeaker.name)
            })
            .fail(onFailure);
        return voxxrinSpeaker;
    }

    function crawl_codeursenseine(baseUrl) {
        console.log('start crawling Codeurs en Seine');
        Q.all([
                //load('http://localhost:4000/programme-2013.json') ,""
                load('http://www.codeursenseine.com/programme-2013.json') ,""
                //,
                //load('http://cfp.breizhcamp.org/accepted/speakers')
            ]).spread(function(programme , speakers) {
                console.log(baseUrl);
                console.log("Loading codeursenseine programme");
                var from = undefined;
                var to = undefined;
                var jourFrom = undefined;
                var jourTo = undefined;
                var fromTime = undefined;
                var toTime = undefined;

                var speakersByTalk = {};

                _(speakers).each(function(speaker) {
                    _(speaker.talks).each(function (talk) {
                        if (speakersByTalk[talk.id] === undefined) {
                            speakersByTalk[talk.id] = [];
                        }
                        speakersByTalk[talk.id].push(speaker);
                    });
                });
                var rooms = [];

                _(programme.programme.jours).each(function (jour){
                    if (from === undefined || from > jour.date) {
                        from = jour.date;
                        jourFrom = jour;
                    }
                    if (to == undefined || to < jour.date) {
                        to = jour.date;
                        jourTo = jour;
                    }

                    _(jour.tracks).each(function(track) {
                        _(track.talks).each(function(talk) {
                            if (talk.time.length < 5) {
                                talk.time = '0' + talk.time;
                            }
                            var hour = parseInt(talk.time.split(":")[0]);
                            var minute = parseInt(talk.time.split(":")[1]);

                            minute += creneaux[talk.format].duree;
                            while (minute >= 60) {
                                hour += 1;
                                minute -= 60;
                            }
                            if (minute < 10) {
                                minute = "0" + minute;
                            }
                            if (hour < 10) {
                                hour = "0" + hour;
                            }
                            talk.endTime = "" + hour + ":" + minute;

                            if (! talk.room) {
                                talk.room = "TBD";
                            }

                            rooms.push(talk.room);
                        });
                    });
                });



                _(jourFrom.tracks).each(function(track){
                    _(track.talks).each(function(talk) {
                        if (fromTime === undefined || fromTime > talk.time) {
                            fromTime = talk.time;
                        }
                    });
                });

                _(jourTo.tracks).each(function(track) {
                    _(track.talks).each(function(talk) {
                        if (toTime === undefined || toTime < talk.endTime) {
                            toTime = talk.endTime;
                        }
                    })
                });

                fromTime = from.split("/")[2] + "-"
                    + from.split("/")[1] + "-"
                    + from.split("/")[0] + " "
                    + fromTime.split(":")[0] + ":"
                    + fromTime.split(":")[1] + ":00.0";
                toTime = to.split("/")[2] + "-"
                    + to.split("/")[1] + "-"
                    + to.split("/")[0] + " "
                    + toTime.split(':')[0] + ":"
                    + toTime.split(':')[1] + ":00.0";
                from = new Date(
                    from.split("/")[2],
                    parseInt(from.split("/")[1]) - 1,
                    from.split("/")[0]);
                to = new Date(
                    to.split("/")[2],
                    parseInt(to.split("/")[1]) - 1,
                    to.split("/")[0]);

                voxxrin.event = {
                    "id": prefix + eventId,
                    "title":"Codeurs En Seine 2013",
                    "subtitle":"",
                    "description":"",
                    "dates": formatDates(from, to),
                    "from": fromTime,
                    "to": toTime,
                    "location":"UFR Rouen - Madrillet", "nbPresentations":0,
                    "days":[],
                    "enabled":true
                };


                var i = 0;
                rooms = _.chain(rooms).uniq(false)
                    .sortBy(function(room) {
                        return room;
                    }).map(function(room) {
                        return {
                            id: i++,
                            name: room
                        };
                    }).value();


                _(rooms).each(function(r) {
                    var room = voxxrin.rooms[r.name] = {"id":voxxrin.event.id + "-" + r.id, "name": r.name,
                        "uri": "/rooms/" + voxxrin.event.id + "-" + r.id};
                    send(baseUrl + '/r' + room.uri, room).then(function() {
                        console.log('ROOM:', room);
                    }).fail(onFailure);
                });

                var indexJour = 0;

                _(programme.programme.jours).each(function(jour) {

                    var day = new Date(
                        jour.date.split("/")[2],
                        parseInt(jour.date.split("/")[1]) -1,
                        jour.date.split("/")[0]);

                    voxxrin.event.days.push(
                        {"id": eventId + '-' + indexJour,
                            "name": dateformat(day, 'mmm dd'),
                            "uri": "/events/" + eventId + "/day/" + eventId + '-' + indexJour,
                            "nbPresentations": 0});
                    voxxrin.daySchedules[jour.date.split("/")[2] + "-"
                        + jour.date.split("/")[1] + "-"
                        + jour.date.split("/")[0]] = {
                        "id": eventId + '-' + indexJour,
                        "dayNumber": indexJour,
                        "schedule": []};

                    indexJour++
                });


                _(programme.programme.jours).each(function(jour) {
                    _(jour.tracks).each(function(track) {
                        _(track.talks).each(function(talk) {
                            voxxrin.event.nbPresentations++;

                            var fromTime = jour.date.split("/")[2] + "-"
                                + jour.date.split("/")[1] + "-"
                                + jour.date.split("/")[0] + " "
                                + talk.time.split(":")[0] + ":"
                                + talk.time.split(":")[1] + ":00.0";

                            var endTime = jour.date.split("/")[2] + "-"
                                + jour.date.split("/")[1] + "-"
                                + jour.date.split("/")[0] + " "
                                + talk.endTime.split(":")[0] + ":"
                                + talk.endTime.split(":")[1] + ":00.0";
                            var daySchedule = voxxrin.daySchedules[jour.date.split("/")[2] + "-"
                                + jour.date.split("/")[1] + "-"
                                + jour.date.split("/")[0]];

                            var voxxrinPres =
                            {
                                "id":prefix + talk.id,
                                "title":talk.title,
                                "type":"Talk",
                                "kind":talk.format,
                                "previousId": null, // TODO : add previous/next logic
                                "nextId": null, // TODO : add previous/next logic
                                "dayId": daySchedule.id,
                                "uri":"/events/" + voxxrin.event.id + "/presentations/" + prefix + talk.id,
                                "room": voxxrin.rooms[talk.room],
                                "slot": talk.time,
                                "fromTime":fromTime,
                                "toTime":endTime
                                ,
                                "speakers":  _(speakersByTalk[talk.id]).map(function(sp){ return toVoxxrinSpeaker(baseUrl, sp); })
                            };

                            // if (talk.id !== undefined) {
                            //     if (!talk.description) {
                            //         talk.description = "";
                            //     }
                            //     load("http://cfp.breizhcamp.org/accepted/talk/" + talk.id).then(function(talkDetail) {
                            //         send(baseUrl + '/r' + voxxrinPres.uri, _.extend(voxxrinPres,
                            //             {
                            //                 "tags":talkDetail.tags,
                            //                 "summary":md(talkDetail.description)
                            //             })).then(function () {
                            //                 console.log('PRESENTATION: ', voxxrinPres.title, daySchedule.id, voxxrinPres.slot)
                            //             }).fail(onFailure);
                            //     });
                            // } else {
                            //     send(baseUrl + '/r' + voxxrinPres.uri, voxxrinPres).then(function () {
                            //             console.log('PRESENTATION: ', voxxrinPres.title, daySchedule.id, voxxrinPres.slot)
                            //         }).fail(onFailure);
                            // }



                            voxxrin.event.days[daySchedule.dayNumber].nbPresentations++;
                            daySchedule.schedule.push(voxxrinPres);

                        });
                    });
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
        crawl: function(baseUrl) {
            crawl_codeursenseine(baseUrl);
        }
    };
}();

//eventFamilyId is the index of thsi array of family
var EVENTS_FAMILIES = [devoxx, mixit, breizhcamp, codeursenseine];

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
    var urlObj = url.parse(req.url, true);
    var mode = urlObj.query.mode;

    // Updating base url in dev mode
    var baseUrl = mode==="dev"?DEV_BASE_URL:PROD_BASE_URL;


    // Browsing only specific event family if "eventFamiliyId" http query param is provided
    var specificEventFamilyId = urlObj.query.eventFamilyId;
    if(specificEventFamilyId){
        if(!_.isArray(specificEventFamilyId)){
            specificEventFamilyId = [ specificEventFamilyId ];
        }
    }

    var eventFamiliesToCrawl = specificEventFamilyId? _.map(specificEventFamilyId, function(famId){ return EVENTS_FAMILIES[famId]; }) : EVENTS_FAMILIES;

    response.writeHead(200, {"Content-Type": "text/plain"});
    if (req.method === 'POST') {
        _(eventFamiliesToCrawl).each(function(eventFamily) {
            eventFamily.crawl(baseUrl);
        });
        response.write("Started crawling...");
    } else {
        response.write("Ready...");
    }
    response.end();
}).listen(port);

console.log('server ready on http://localhost:' + port + '/');
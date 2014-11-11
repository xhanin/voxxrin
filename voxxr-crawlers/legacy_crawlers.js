var http = require("http"),
    Q = require('q'),
    _ = require('underscore'),
    dateformat = require('dateformat'),
    load = require("./load.js"),
    send = require("./send.js"),
    request = require('request'),
    token = require('./authorizationToken'),
    md = require('node-markdown').Markdown
    ;

var voxxrin = {
    event: {},
    rooms: {},
    daySchedules: {}
};

function onFailure(err) {
    console.log('ERROR', err);
}


/**
 * These crawlers should be refactored to meet the VoxxrinCrawler usage
 */
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

var devoxx = function() {
    var prefix = 'dvx';
    var eventIds = [
        10 /* Devoxx World 2k13 */
        // Following events are commented, since not available anymore...
        // 8 /* devoxx fr */, 9 /* devoxx UK */,
         ];

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
                    'Authorization':token.gae
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

                var notDuplicatedSpeakers = _.map(_.uniq(_.pluck(s.speakers, "speakerId")), function(speakerId){ return _.find(s.speakers, function(speaker){ return speaker.speakerId === speakerId; }); });
                var voxxrinPres = {"id":prefix + s.id, "title":s.title, "type":s.type, "kind":s.kind,
                        "dayId": daySchedule.id,
                        "uri":"/events/" + voxxrin.event.id + "/presentations/" + prefix + s.id,
                        "speakers": _(notDuplicatedSpeakers).map(function(sp){ return toVoxxrinSpeaker(baseUrl, sp); }),
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
                'Authorization':token.gae
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
        },
        "podcast": {
            title: 'Podcast',
            duree: 60
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


        if (speaker.avatar != "")
        {
            request.get(speaker.avatar).pipe(request.put({
                url: baseUrl + '/r' + pictureURI,
                headers: {
                    'Authorization':token.gae
                }
            }, function(error, response, body) {}));
        }



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
            .fail(function (err) {
                console.log('ERROR: ', err, voxxrinSpeaker.id, voxxrinSpeaker.name)
            });


        return voxxrinSpeaker;
    }

    function crawl_codeursenseine(baseUrl) {
        console.log('start crawling Codeurs en Seine');
        Q.all([
                load('http://www.codeursenseine.com/programme-2013.json') ,load('http://www.codeursenseine.com/speakers-2013.json')

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
                    }).fail(function (err) {
                console.log('ERROR ROOM: ', err)
            });
                });

                console.log("ROOM SENT!");

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
                                "dayId": daySchedule.id,
                                "uri":"/events/" + voxxrin.event.id + "/presentations/" + prefix + talk.id,
                                "room": voxxrin.rooms[talk.room],
                                "slot": talk.time,
                                "fromTime":fromTime,
                                "toTime":endTime,
                                "summary":talk.description,
                                "speakers":  _(speakersByTalk[talk.id]).map(function(sp){ return toVoxxrinSpeaker(baseUrl, sp); })
                            };


                            if (talk.id === undefined) {

                                send(baseUrl + '/r' + voxxrinPres.uri, voxxrinPres).then(function () {
                                        console.log('PRESENTATION: ', voxxrinPres.title, daySchedule.id, voxxrinPres.slot)
                                    }).fail(onFailure);
                            }



                            voxxrin.event.days[daySchedule.dayNumber].nbPresentations++;
                            //console.log('TALK:', voxxrinPres);
                            daySchedule.schedule.push(voxxrinPres);

                        });
                    });
                });


                send(baseUrl + '/r/events', voxxrin.event).then(function() {
                    console.log('EVENT:', voxxrin.event.title);
                }).fail(function (err) {
                console.log('ERROR EVENTS: ', err)
            });
                _(voxxrin.daySchedules).each(function (ds) {
                    send(baseUrl + '/r/events/' + voxxrin.event.id + '/day/' + ds.id, ds).then(function(){
                        console.log('DAY SCHEDULE:', ds.id, ' LENGTH:', ds.schedule.length);
                        console.log("SCHEDULE SENT!");
                    }).fail(function (err) {
                console.log('ERROR SCHEDULE: ', err)
            });
                });
            }).fail(function (err) {
                console.log('ERROR GLOBAL: ', err)
            });
    }

    return {
        crawl: function(baseUrl) {
            crawl_codeursenseine(baseUrl);
        }
    };
}();
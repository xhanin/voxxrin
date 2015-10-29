var http = require("http"),
    _ = require('underscore'),
    url = require('url'),
    token = require('./authorizationToken'),
    mixit = require('./crawler_mixit.js'),
    jugsummercamp = require('./crawler_jugsummercamp.js'),
    lanyrd = require('./crawler_lanyrd.js'),
    devoxxfr = require('./crawler_devoxxfr.js'),
    breizhcamp = require('./crawler_breizhcamp.js')
    codeursenseine = require('./crawler_codeursenseine.js')
    ;

var PROD_BASE_URL = 'http://app.voxxr.in';
var DEV_BASE_URL = 'http://localhost:8081';


process.on('uncaughtException', function (exception) {
    console.log(exception); // to see your exception details in the console
    // if you are on production, maybe you can send the exception details to your
    // email as well ?
});

var EVENTS = {
    "devoxxfr14": {
        crawlerType: devoxxfr, authTokens: [ "dvxfr", "all" ],
        event: {
            /* Devoxx Fr 2014 */
            id: 14,
            /* Hardcoding some event details here, since not provided by REST API */
            from: new Date(Date.parse("2014-04-16T08:00:00.000+02:00")),
            to: new Date(Date.parse("2014-04-18T18:55:00.000+02:00")),
            title: "Devoxx France 2014",
            subtitle: "",
            description: "",
            timezone: "Europe/Paris",
            location: "Mariott Hotel",
            initialCrawlingUrls: [
                "http://cfp.devoxx.fr/api/conferences/devoxxFR2014/schedules/wednesday",
                "http://cfp.devoxx.fr/api/conferences/devoxxFR2014/schedules/thursday",
                "http://cfp.devoxx.fr/api/conferences/devoxxFR2014/schedules/friday"
            ],
            prefix: 'dvxfr'
        }
    },
    "devoxxfr15": {
        crawlerType: devoxxfr, authTokens: [ "dvxfr", "all" ],
        event: {
            /* Devoxx Fr 2015 */
            id: 15,
            /* Hardcoding some event details here, since not provided by REST API */
            from: new Date(Date.parse("2015-04-08T08:00:00.000+02:00")),
            to: new Date(Date.parse("2015-04-10T18:55:00.000+02:00")),
            title: "Devoxx France 2015",
            subtitle: "",
            description: "",
            timezone: "Europe/Paris",
            location: "Palais des Congrès",
            initialCrawlingUrls: [
                "http://cfp.devoxx.fr/api/conferences/devoxxFR2015/schedules/wednesday",
                "http://cfp.devoxx.fr/api/conferences/devoxxFR2015/schedules/thursday",
                "http://cfp.devoxx.fr/api/conferences/devoxxFR2015/schedules/friday",
                "https://gist.githubusercontent.com/fcamblor/0e8a9729de364c1818f5/raw/15c38775d2f60e23d3cadd8651826148f9e0f5cb/devoxxfr2015-special.json"
            ],
            prefix: 'dvxfr',
            idTransformer: function(calculatedPrezId, eventId, initialSchedule) {
                // For special additionnal shedules having same id on different times, we should provide additionnal
                // part in the id (we use utc hours in order to make it deterministic)
                if(initialSchedule.id === 'SFJ-5646') {
                    var fromTime = new Date(Date.parse(initialSchedule.fromTime));
                    return calculatedPrezId + '-' + fromTime.getUTCHours();
                } else {
                    return calculatedPrezId;
                }
            }
        }
    },
    "devoxxpl15": {
        crawlerType: devoxxfr, authTokens: [ "dvxpl", "all" ],
        event: {
            /* Devoxx Poland 2015 */
            id: 15,
            /* Hardcoding some event details here, since not provided by REST API */
            from: new Date(Date.parse("2015-06-22T08:00:00.000+02:00")),
            to: new Date(Date.parse("2015-06-25T18:55:00.000+02:00")),
            title: "Devoxx Poland 2015",
            titlePropName: 'nameEN',
            subtitle: "",
            description: "",
            timezone: "Europe/Warsaw",
            location: "ICE Congress Centre",
            initialCrawlingUrls: [
                "http://cfp.devoxx.pl/api/conferences/DevoxxPL2015/schedules/monday",
                "http://cfp.devoxx.pl/api/conferences/DevoxxPL2015/schedules/tuesday",
                "http://cfp.devoxx.pl/api/conferences/DevoxxPL2015/schedules/wednesday",
                "http://cfp.devoxx.pl/api/conferences/DevoxxPL2015/schedules/thursday"
            ],
            prefix: 'dvxpl'
        }
    },
    "mixit13": {
        crawlerType: mixit, authTokens: [ "mixit", "all" ],
        event: {
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
    },
    "mixit14": {
        crawlerType: mixit, authTokens: [ "mixit", "all" ],
        event: {
            /* Mix-IT 2014 */
            id: 14,
            /* Hardcoding some event details here, since not provided by REST API */
            from: new Date(Date.parse("2014-04-29T09:00:00.000+02:00")),
            to: new Date(Date.parse("2014-04-30T18:30:00.000+02:00")),
            title: "Mix-IT 2014",
            subtitle: "",
            description: "Java, Agilité, Web, Innovations... Des idées pour tout de suite !",
            location: "CPE Lyon"
        }
    },
    "mixit15": {
        crawlerType: mixit, authTokens: [ "mixit", "all" ],
        event: {
            /* Mix-IT 2015 */
            id: 15,
            /* Hardcoding some event details here, since not provided by REST API */
            from: new Date(Date.parse("2015-04-16T09:00:00.000+02:00")),
            to: new Date(Date.parse("2015-04-17T18:30:00.000+02:00")),
            title: "Mix-IT 2015",
            subtitle: "",
            description: "Développement, Agilité, Innovations, DevOps, Lean Startup... Des idées pour tout de suite !",
            location: "CPE Lyon"
        }
    },
    "lkbf13": {
        crawlerType: lanyrd, authTokens: [ "leanKB", "all" ],
        event: {
            /* Lean Kanban France 2013 */
            id: 13,
            /* Hardcoding some event details here, since not provided by REST API */
            title: 'Lean Kanban France 2013',
            domainUrl: 'http://lanyrd.com',
            baseUrl: 'http://lanyrd.com/2013/lean-kanban-france/',
            prefix: 'lkbf',
            timezoneOffset: -120
        }
    },
    "jsc13": {
        crawlerType: jugsummercamp, authTokens: [ "jgscmp", "all" ],
        event: {
            /* Jugsummercamp 2013 */
            id: 13,
            /* Hardcoding some event details here, since not provided by REST API */
            title: "JugSummerCamp 2013",
            description: "Une journée entière, à l'espace Encan de La Rochelle, pour prendre les dernières nouvelles du monde Java.",
            initialCrawlingUrls: ["http://www.jugsummercamp.com/api/edition/4"]
        }
    },
    "jsc14": {
        crawlerType: jugsummercamp, authTokens: [ "jgscmp", "all" ],
        event: {
            /* Jugsummercamp 2014 */
            id: 14,
            /* Hardcoding some event details here, since not provided by REST API */
            title: "JugSummerCamp 2014",
            description: "Une journée entière, à l'espace Encan de La Rochelle, pour prendre les dernières nouvelles du monde Java.",
            initialCrawlingUrls: ["http://www.jugsummercamp.com/api/edition/5"]
        }
    },
    "jsc15": {
        crawlerType: jugsummercamp, authTokens: [ "jgscmp", "all" ],
        event: {
            /* Jugsummercamp 2015 */
            id: 15,
            /* Hardcoding some event details here, since not provided by REST API */
            title: "JugSummerCamp 2015",
            description: "Une journée entière, à l'espace Encan de La Rochelle, pour prendre les dernières nouvelles du monde Java.",
            initialCrawlingUrls: ["http://www.jugsummercamp.com/api/edition/6"]
        }
    },
    "bzh15": {
        crawlerType: breizhcamp, authTokens: [ "bzh", "all" ],
        event: {
            /* Breizhcamp 2015 */
            id: 15,
            /* Hardcoding some event details here, since not provided by REST API */
            from: new Date(Date.parse("2015-06-10T13:00:00.000+02:00")),
            to: new Date(Date.parse("2015-06-12T18:25:00.000+02:00")),
            title: "Breizhcamp 2015",
            subtitle: "",
            description: "Un mix de technologies, un max de connaissances",
            timezone: "Europe/Paris",
            location: "ISTIC Campus de Beaulieu - Rennes",
            initialCrawlingUrls: [
                "http://www.breizhcamp.org/json/schedule.json",
                "http://www.breizhcamp.org/json/talks.json"
            ]
        }
    },
    "bzh14": {
        crawlerType: breizhcamp, authTokens: [ "bzh", "all" ],
        event: {
            /* Breizhcamp 2014 */
            id: 14,
            /* Hardcoding some event details here, since not provided by REST API */
            title: "Breizhcamp 2014",
            description: "Un mix de technologies, un max de connaissances",
            initialCrawlingUrls: [
                "https://raw.githubusercontent.com/BreizhJUG/breizhcamp-www/gh-pages/_includes/json/schedule.json",
                "https://raw.githubusercontent.com/BreizhJUG/breizhcamp-www/gh-pages/_includes/json/talks.json"
            ]
        }
    },
    "bdxio15": {
        crawlerType: devoxxfr, authTokens: [ "bdxio", "all" ],
        event: {
            /* BDXIO 2015 */
            id: '15',
            /* Hardcoding some event details here, since not provided by REST API */
            from: new Date(Date.parse("2015-10-16T08:00:00.000+02:00")),
            to: new Date(Date.parse("2015-10-16T18:20:00.000+02:00")),
            title: "BDXIO 2015",
            titlePropName: 'nameFR',
            subtitle: "",
            description: "",
            timezone: "Europe/Paris",
            location: "ENSEIRB",
            initialCrawlingUrls: [
                "http://cfp.bdx.io/api/conferences/BdxIO2015/schedules/friday"
            ],
            prefix: 'bdxio'
        }
    },
    "bdxio14": {
        crawlerType: devoxxfr, authTokens: [ "bdxio", "all" ],
        event: {
            /* BDXIO 2014 */
            id: '14',
            /* Hardcoding some event details here, since not provided by REST API */
            from: new Date(Date.parse("2014-10-17T08:00:00.000+02:00")),
            to: new Date(Date.parse("2014-10-17T18:20:00.000+02:00")),
            title: "BDXIO 2014",
            subtitle: "",
            description: "",
            timezone: "Europe/Paris",
            location: "ENSEIRB",
            initialCrawlingUrls: [
                "http://cfp.bdx.io/api/conferences/BdxIO2014/schedules/friday"
            ],
            prefix: 'bdxio'
        }
        /* old crawler for lanyrd ...
        crawlerType: lanyrd, authTokens: [ "7", "all" ],
        event: {
            id: 'bdxio14',
            title: 'BDXIO 2014',
            domainUrl: 'http://lanyrd.com',
            baseUrl: 'http://lanyrd.com/2014/bdxio/',
            schedulePagesCount: 2,
            presentationUpdater: function(pres){
                var type, title;
                if(pres.title.indexOf("[CONF]") !== -1){
                    type = "Conference";
                    title = pres.title.replace("[CONF] ","");
                } else if(pres.title.indexOf("[QUICK]") !== -1){
                    type = "Quickie";
                    title = pres.title.replace("[QUICK] ","");
                } else if(pres.title.indexOf("[HANDS-ON]") !== -1){
                    type = "Hand's On"
                    title = pres.title.replace("[HANDS-ON] ","");
                } else {
                    type = "Unknown";
                    title = pres.title;
                }

                var id, uri, match;
                var cfpIdRegex = /(.*)\s\((.+)\)$/gi;
                if(match = cfpIdRegex.exec(title)){
                    title = match[1];
                    id = "bdxio14-"+match[2].toLowerCase();
                    uri = pres.uri.replace(pres.id, id);
                } else {
                    id = pres.id;
                    uri = pres.uri;
                }

                return {type:type, title:title, id:id, uri:uri};
            }
        }
        */
    },
    "lkfr14": {
        crawlerType: lanyrd, authTokens: [ "leanKB", "all" ],
        event: {
            /* Lean Kanban France 2014 */
            id: 14,
            /* Hardcoding some event details here, since not provided by REST API */
            title: 'Lean Kanban France 2014',
            domainUrl: 'http://lanyrd.com',
            baseUrl: 'http://lanyrd.com/2014/lkfr14/',
            roomNameTransformer: function(roomName) {
                // Transforming room name like "In\n\t\t\t\tSalle Emile Laffon (250),\n\t\t\t\tMaison des Associations de Solidarité"
                // to something like "Salle Emile Laffon"
                return roomName.replace(/In\s+(.+)\s\(\d+.*\),\s+.*/, "$1");
            },
            prefix: 'lkfr',
            timezoneOffset: -60
        }
    },
    "lkfr15": {
        crawlerType: lanyrd, authTokens: [ "leanKB", "all" ],
        event: {
            /* Lean Kanban France 2015 */
            id: 15,
            /* Hardcoding some event details here, since not provided by REST API */
            title: 'Lean Kanban France 2015',
            domainUrl: 'http://lanyrd.com',
            baseUrl: 'http://lanyrd.com/2015/lkfr15/',
            roomNameTransformer: function(roomName) {
                // Transforming room name like "In\n\t\t\t\tSalle Emile Laffon (250),\n\t\t\t\tMaison des Associations de Solidarité"
                // to something like "Salle Emile Laffon"
                return roomName.replace(/\s+/gmi, " ").replace(/In\s/gmi, "").replace(/, Maison des Associations de Solidarité/gmi, "");
            },
            prefix: 'lkfr',
            timezoneOffset: -60
        }
    },
    "ces14": {
        crawlerType: codeursenseine, authTokens: [ "ces", "all" ],
        event: {
            /* Codeurs en Seine 2014 */
            id: 762,
            /* Hardcoding some event details here, since not provided by REST API */
            title: "Codeurs en Seine 2014",
            description: "Web, Agile, Java et Innovation",
            initialCrawlingUrls: [
                "http://www.codeursenseine.com/2014/programme.json",
                "http://www.codeursenseine.com/2014/speakers.json"
            ]
        }
    },
    "ces15": {
        crawlerType: devoxxfr, authTokens: [ "ces", "all" ],
        event: {
            /* CES 2015 */
            id: 763,
            /* Hardcoding some event details here, since not provided by REST API */
            from: new Date(Date.parse("2015-11-26T09:00:00.000+02:00")),
            to: new Date(Date.parse("2015-11-26T18:00:00.000+02:00")),
            title: "Codeurs En Seine 2015",
            titlePropName: 'nameFR',
            subtitle: "",
            description: "",
            timezone: "Europe/Paris",
            location: "Université de Rouen, Saint-Étienne-du-Rouvray",
            initialCrawlingUrls: [
                "http://cfp.codeursenseine.com/api/conferences/CodeursEnSeine2015/schedules/thursday/"
            ],
            prefix: 'ces'
        }
    }
};

var port = process.env.PORT || 3000;
http.createServer(function(req, response) {
    var urlObj = url.parse(req.url, true);
    var mode = urlObj.query.mode;
    var apiKey = urlObj.query.apiKey;

    // Updating base url in dev mode
    var baseUrl = mode==="dev"?DEV_BASE_URL:PROD_BASE_URL;
    var debugQueries = true|| mode==="dev";_.keys(EVENTS);


    // Browsing only specific event family if "eventFamiliyId" http query param is provided
    var specificEventFamilyId = urlObj.query.eventFamilyId;
    if(specificEventFamilyId){
        if(!_.isArray(specificEventFamilyId)){
            specificEventFamilyId = [ specificEventFamilyId ];
        }
    } else {
        specificEventFamilyId = _.keys(EVENTS);
    }

    // Ensuring given apiKey allows the user to call the crawler for given family id
    for(var i=0; i<specificEventFamilyId.length; i++) {
        var eventName = specificEventFamilyId[i];
        var allowedApiKeys = _.map(EVENTS[ eventName].authTokens, function(authToken){ return token.crawlersFamilies[authToken]; });
        if(_.contains(allowedApiKeys, apiKey)) {
            // No problem
        } else {
            response.writeHead(401, {"Content-Type": "text/plain"});
            response.write("Bad apiKey for event ["+eventName+"] !");
            response.end();
            return;
        }
    }

    var eventsToCrawl = _.map(specificEventFamilyId, function(famId){ return EVENTS[famId]; });

    response.writeHead(200, {"Content-Type": "text/plain"});
    if (req.method === 'POST') {
        response.write("Started crawling...");
        _(eventsToCrawl).each(function(eventToCrawl) {
            eventToCrawl["crawlerType"].crawlEvent(baseUrl, eventToCrawl["event"], debugQueries);
        });
    } else {
        response.write("Ready...");
    }
    response.end();
}).listen(port);

console.log('server ready on http://localhost:' + port + '/');

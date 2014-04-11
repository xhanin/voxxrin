var http = require("http"),
    _ = require('underscore'),
    url = require('url'),
    token = require('./authorizationToken'),
    mixit = require('./crawler_mixit.js'),
    jugsummercamp = require('./crawler_jugsummercamp.js'),
    lanyrd = require('./crawler_lanyrd.js'),
    devoxxfr = require('./crawler_devoxxfr.js')
    ;

var PROD_BASE_URL = 'http://app.voxxr.in';
var DEV_BASE_URL = 'http://localhost:8080';


//eventFamilyId is the index of thsi array of family
var EVENTS_FAMILIES = [devoxx, mixit, breizhcamp, codeursenseine, jugsummercamp, lanyrd, devoxxfr];

var port = process.env.PORT || 3000;
http.createServer(function(req, response) {
    var urlObj = url.parse(req.url, true);
    var mode = urlObj.query.mode;
    var apiKey = urlObj.query.apiKey;

    // Updating base url in dev mode
    var baseUrl = mode==="dev"?DEV_BASE_URL:PROD_BASE_URL;
    var debugQueries = true || mode==="dev";


    // Browsing only specific event family if "eventFamiliyId" http query param is provided
    var specificEventFamilyId = urlObj.query.eventFamilyId;
    if(specificEventFamilyId){
        if(!_.isArray(specificEventFamilyId)){
            specificEventFamilyId = [ specificEventFamilyId ];
        }
    } else {
        specificEventFamilyId = _.range(EVENTS_FAMILIES.length);
    }

    // Ensuring given apiKey allows the user to call the crawler for given family id
    if(specificEventFamilyId.length === 1) {
        if(token.crawlersFamilies.all === apiKey
            || token.crawlersFamilies[specificEventFamilyId[0]] === apiKey) {

            // No problem
        } else {
            response.writeHead(401, {"Content-Type": "text/plain"});
            response.write("Bad apiKey !");
            response.end();
            return;
        }
    } else {
        if(token.crawlersFamilies.all === apiKey) {
            // No problem
        } else {
            response.writeHead(401, {"Content-Type": "text/plain"});
            response.write("Bad apiKey !");
            response.end();
            return;
    }
    }

    var eventFamiliesToCrawl = _.map(specificEventFamilyId, function(famId){ return EVENTS_FAMILIES[famId]; });

    response.writeHead(200, {"Content-Type": "text/plain"});
    if (req.method === 'POST') {
        _(eventFamiliesToCrawl).each(function(eventFamily) {
            eventFamily.crawl(baseUrl, debugQueries);
        });
        response.write("Started crawling...");
    } else {
        response.write("Ready...");
    }
    response.end();
}).listen(port);

console.log('server ready on http://localhost:' + port + '/');
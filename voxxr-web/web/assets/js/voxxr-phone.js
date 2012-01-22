var jQT = new $.jQTouch({
    statusBar: 'black'
});

$(function() {

    var user = "anonymous",
        room = "1",
        baseUrl = "http://r" + room + ".voxxr.in:8076/r",
        transport = "long-polling";

    // COMMON

    function feedback(user, v) {
        return user + '|' + v;
    }


    function parseFeedback(f) {
        var parts = f.split('|');
        var feedback = {};
        if (parts.length > 2) {
            feedback.room = parts[0];
            feedback.user = parts[1];
            feedback.value = parts[2];
        } else {
            feedback.room = room;
            feedback.user = parts[0];
            feedback.value = parts[1];
        }

        feedback.isRate = feedback.value.substr(0,1) === 'R';
        if (feedback.isRate) {
            feedback.rateValue = feedback.value.substr(1);
            feedback.index = feedback.rateValue;
        }
        feedback.isConnection = feedback.value.substr(0,1) === 'C';
        if (feedback.isConnection) {
            feedback.connections = feedback.value.substr(1);
        }
        feedback.isTitle = feedback.value.substr(0,1) === 'T';
        if (feedback.isTitle) {
            feedback.title = feedback.value.substr(1);
        }

        return feedback;
    }

    (function() {
        $.ajax({
                type: "GET",
                url: baseUrl + "/room",
                dataType:"json",
                success: function( resp ) {
                    if (resp.status === 'ok') {
                        $("#roomRT h1").text(resp.title);
                        $("#feedback .dashboard .connections").text(resp.connections);
                        $("#feedback").show();
                    } else {
                        $("#roomRT h1").text(resp.message);
                        // TODO: add something to allow to retry
                    }
                },
                error: function(xhr, type) {
                    console.error('-------------- CONNECTION ERROR' + xhr);
                    $("#roomRT h1").text("Can't connect to room. Is it currently opened?");
                        // TODO: add something to allow to retry
                }
            });
    })();

    (function() {
        // FEEDBACK

        var feedbackPnl = $("#feedback");

        // FEEDBACK.RATE
        var ratePnl = feedbackPnl.find(".rate");
        var myRate = {avg: 0, last: 0};

        var stars = ratePnl.find(".star");

        stars.tap(function() {
            vote($(this).attr('data-rate'));
            return false;
        });

        function setVotes() {
            for (var i = 1; i <= 5; i++) {
                var v = ratePnl.find('[data-rate="' + i + '"]');
                if (i<=myRate.last) {
                    v.addClass('vote');
                } else {
                    v.removeClass('vote');
                }
            }

        }

        function vote(r) {
            console.debug('-------------- VOTING ', r, ' ON ', baseUrl, "/feedback");
            $.ajax({
                type: "POST",
                url: baseUrl + "/feedback",
                data: feedback(user, "R" + r),
                dataType:"json",
                success: function( resp ) {
                    if (resp.status === 'ok') {
                        myRate.last = r;
                        setVotes();
                    }
                },
                error: function(xhr, type) {
                    console.error('-------------- VOTE ERROR' + xhr);
                }
            });
        }
    })();

    (function() {
        // DASHBOARD
        var rateMean = $("#feedback .dashboard .rateMean");
        var connections = $("#feedback .dashboard .connections");

        var rate =  {
            nb: 0,
            avg: 0
        }

        function subscribe() {
                console.info('-------------- SUBSCRIBING TO ' + baseUrl + '/room/rt');
                $.atmosphere.subscribe(
                    baseUrl + '/room/rt',
                    function(response) {
                        if (response.transport != 'polling' && response.state != 'connected' && response.state != 'closed') {
                            if (response.status == 200) {
                                var data = response.responseBody;
                                if (data.length > 0) {
                                    var f = parseFeedback(data);

                                    if (f.isConnection) {
                                        connections.text(f.connections);
                                    }
                                    if (f.isTitle) {
                                        $("#roomRT h1").text(f.title);
                                    }
                                    if (f.isRate) {
                                        rate.avg = ((rate.avg * rate.nb) + (f.rateValue * 100)) / (rate.nb + 1);
                                        rate.nb++;

                                        rateMean.text((rate.avg / 100).toFixed(2));
                                    }

                                }
                            }
                        }
                    },
                    $.atmosphere.request = { transport: transport });
        }

        subscribe();

    })();

});
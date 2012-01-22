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
        feedback.isPollStart = feedback.value.substr(0,2) === 'PS';
        if (feedback.isPollStart) {
            feedback.items = feedback.value.substr(2).split(',');
        }
        feedback.isPollEnd = feedback.value.substr(0,2) === 'PE';

        return feedback;
    }

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
                        if (response.state == 'error' || response.state == 'closed') {
                            $("#roomRT .message").text("Room connection lost").show();
                            $("#roomRT div.reconnect").show();
                            $("#roomRT .content").hide();
                            return;
                        }
                        if (response.transport != 'polling'
                            && response.state != 'connected' && response.state != 'closed') {
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
                                    if (f.isPollStart) {
                                        $("#roomRT #poll .nopoll").hide();
                                        var p = ''
                                        $(f.items).each(function(i) {
                                            p += '<li><a href="#" data-value="' + i + '">' + this + '</a></li>'
                                        });
                                        $("#roomRT #poll ul").html(p).show();
                                        $("#roomRT .tabs a.poll").text('< POLL >');
                                    }
                                    if (f.isPollEnd) {
                                        $("#roomRT #poll .nopoll").show();
                                        $("#roomRT #poll ul").hide();
                                        $("#roomRT .tabs a.poll").text('POLL');
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

        var connect = function() {
            $("#roomRT div.reconnect").hide();
            $("#roomRT .message").text("Connecting to room...").show();
            $.ajax({
                type: "GET",
                url: baseUrl + "/room",
                dataType:"json",
                success: function(resp) {
                    if (resp.status === 'ok') {
                        $("#roomRT h1").text(resp.title);
                        $("#feedback .dashboard .connections").text(resp.connections);
                        rate.nb = resp.ratings;
                        rate.avg = resp.rate * 100;
                        rateMean.text((rate.avg / 100).toFixed(2));
                        
                        $("#roomRT .message").hide();
                        $("#roomRT .content").show();
                        $("#roomRT div.reconnect").show();
                        subscribe();
                    } else {
                        $("#roomRT .message").text(resp.message).show();
                        $("#roomRT div.reconnect").show();
                    }
                },
                error: function(xhr, type) {
                    console.error('-------------- CONNECTION ERROR', xhr);
                    $("#roomRT .message").text("Can't connect to room. Is it currently opened?").show();
                    $("#roomRT div.reconnect").show();
                }
            });
        };
        connect();

        function voteForPoll(r) {
            console.debug('-------------- VOTING FOR POLL ', r, ' ON ', baseUrl, "/feedback");
            $.ajax({
                type: "POST",
                url: baseUrl + "/feedback",
                data: feedback(user, "PV" + r),
                dataType:"json",
                success: function( resp ) {
                    if (resp.status === 'ok') {
                        $("#roomRT #poll ul li a").removeClass("current");
                        $("#roomRT #poll ul li a[data-value='" + r + "']").addClass("current");
                    }
                },
                error: function(xhr, type) {
                    console.error('-------------- POLL VOTE ERROR' + xhr);
                }
            });
        }

        $("#roomRT a.reconnect").click(function() {
            $.atmosphere.closeSuspendedConnection();
            connect();
        });


        $("#roomRT .tabs a.rate").click(function() {
            $("#roomRT .tabs a").removeClass("current");
            $(this).addClass("current");
            $("#roomRT #feedback").show();
            $("#roomRT div#poll").hide();
        });

        $("#roomRT .tabs a.poll").click(function() {
            $("#roomRT .tabs a").removeClass("current");
            $(this).addClass("current");
            $("#roomRT #feedback").hide();
            $("#roomRT div#poll").show();
        });

        $("#roomRT #poll ul li a").live('click', function() {
            voteForPoll($(this).attr('data-value'));
        });
    })();

});
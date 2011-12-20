$(function() {
    var user = "xavierhanin",
        room = "123",
        transport = "streaming";

    // COMMON
    function isTouchDevice() {
        return "ontouchstart" in window;
    }


    function feedback(user, room, v) {
        return room + '|' + user + '|' + v;
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

        return feedback;
    }


    (function() {
        // FEEDBACK

        var feedbackPnl = $("#feedback");

        // FEEDBACK.RATE
        var ratePnl = feedbackPnl.find(".rate");
        var myRate = {avg: 0, last: 0};

        var stars = ratePnl.find(".star");

        if (isTouchDevice()) {
            ratePnl.on('touchend', '.star', function() {
                stars.removeClass('over');
                vote($(this).attr('data-rate'));
                return false;
            });
        } else {
            stars.hover(
                function() {
                    $(this).prevAll().andSelf().addClass('over');
                    $(this).nextAll().removeClass('vote');
                },
                function() {
                    stars.removeClass('over');
                    setVotes();
                }
            );

            ratePnl.on('click', '.star', function() {
                stars.removeClass('over');
                vote($(this).attr('data-rate'));
                return false;
            });
        }


        function setVotes() {
            ratePnl
                .find('[data-rate="' + myRate.last + '"]').prevAll().andSelf().addClass('vote')
                .find('[data-rate="' + myRate.last + '"]').nextAll().removeClass('vote');
        }

        function vote(r) {
            $.ajax({
                type: "POST",
                url: "/feedback",
                data: feedback(user, room, "R" + r),
                dataType:"json"
            }).done(function( resp ) {
                    if (resp.status === 'ok') {
                        myRate.last = r;
                        setVotes();
                    }
                });
        }
    })();


    (function() {
        // DASHBOARD
        var dashboardPnl = $("#dashboard");

        var ratePnl = dashboardPnl.find(".rate");

        var rate =  {
            nb: 0,
            avg: 0
        }

        function subscribe() {
                $.atmosphere.subscribe(
                    '/room/' + room,
                    function(response) {
                        if (response.transport != 'polling' && response.state != 'connected' && response.state != 'closed') {
                            if (response.status == 200) {
                                var data = response.responseBody;
                                if (data.length > 0) {
                                    var f = parseFeedback(data);

                                    if (f.isRate) {
                                        rate.avg = ((rate.avg * rate.nb) + (f.rateValue * 100)) / (rate.nb + 1);
                                        rate.nb++;

                                        ratePnl.find(".mean").html((rate.avg / 100).toFixed(2));


                                        var rateDrops = Processing.getInstanceById("rateDrops");
                                        if(rateDrops != null) { rateDrops.addEvenire(f); }
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
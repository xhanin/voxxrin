$(function() {
    // COMMON
    function isTouchDevice() {
        return "ontouchstart" in window;
    }

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
            data: "R" + r,
            dataType:"json"
        }).done(function( resp ) {
                if (resp.status === 'ok') {
                    myRate.last = r;
                    setVotes();
                }
            });
    }
});
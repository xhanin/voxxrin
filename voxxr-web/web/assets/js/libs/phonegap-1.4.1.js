(function(){
    function deviceready() {
        // fire off deviceready
        window.device = {};
        navigator.device = window.device;
        var e = document.createEvent('Events');
        e.initEvent('deviceready');
        document.dispatchEvent(e);
    }

    window.PhoneGap = {};

    _.extend(window.navigator, {
        notification: {
            vibrate: function(){},
            alert: function(msg) {alert(msg)}
        }
    });
    $(deviceready);
})();
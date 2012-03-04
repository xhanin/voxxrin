(function(){
    function deviceready() {
        // fire off deviceready
        var e = document.createEvent('Events');
        e.initEvent('deviceready');
        document.dispatchEvent(e);
    }

    window.device = {};
    window.PhoneGap = {};
    deviceready();
})();
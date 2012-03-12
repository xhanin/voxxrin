var Connection = {};
Connection.UNKNOWN = "unknown";
Connection.ETHERNET = "ethernet";
Connection.WIFI = "wifi";
Connection.CELL_2G = "2g";
Connection.CELL_3G = "3g";
Connection.CELL_4G = "4g";
Connection.NONE = "none";

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
        },
        network: {
            connection: {
                type: Connection.UNKNOWN
            }
        }
    });
    $(deviceready);
})();
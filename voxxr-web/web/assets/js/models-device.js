(function(exports) {

    var Device = function() {
        var self = this;
        self.id = ko.observable(null);
        self.offline = function() {
            if (typeof navigator.device == "undefined") {
                return true;
            }
            return navigator.network.connection.type === Connection.NONE;
        };

        function load(data) {
            self.id(data.id);
        }

        whenDeviceReady(function() {
            var devicedata = localStorage.getItem('deviceinfo');
            if (devicedata && devicedata.id) {
                console.log('device (from ls) ' + devicedata);
                devicedata = JSON.parse(devicedata);
                load(devicedata);
            } else {
                var deviceinfo = _.extend(
                    {userAgent: navigator.userAgent, userLanguage: navigator.userLanguage},
                    navigator.device);
                $.ajax({
                    url: models.baseUrl + "/devices/",
                    dataType:"json",
                    type: "POST",
                    data: JSON.stringify(deviceinfo),
                    success: function(data) {
                        localStorage.setItem('deviceinfo', JSON.stringify(data));
                        load(data);
                        console.log('device (from server) ' + JSON.stringify(data));
                    }
                });
            }
        });
    }
    Device.current = ko.observable(new Device());

    exports.models = exports.models || {};
    exports.models.Device = Device;
})(window);
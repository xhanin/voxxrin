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
            ready();
        }

        var whenReadyCallbacks = [];
        var isReady = false;
        function ready() {
            isReady = true;
            _(whenReadyCallbacks).each(function(c) { c(self); });
        }

        whenDeviceReady(function() {
            var devicedata = localStorage.getItem('deviceinfo');
            if (devicedata) {
                var deviceinfo = JSON.parse(devicedata);
                if (deviceinfo.id) {
                    console.log('device (from ls) ' + devicedata);
                    load(deviceinfo);
                    return;
                }
            }
            var deviceinfo = _.extend(
                {userAgent: navigator.userAgent, userLanguage: navigator.userLanguage},
                navigator.device);
            if (self.offline()) {
                // offline for the first device startup :(
                deviceinfo.id = new Date().getTime();
                localStorage.setItem('deviceinfo', deviceinfo);
                load(deviceinfo);
                console.log('device (guessed) ' + JSON.stringify(deviceinfo));
            } else {
                var loadFromServer = function(){
                    $.ajax({
                        url: models.baseUrl + "/devices/",
                        dataType:"json",
                        type: "POST",
                        data: JSON.stringify(deviceinfo),
                        success: function(data) {
                            localStorage.setItem('deviceinfo', JSON.stringify(data));
                            load(data);
                            console.log('device (from server) ' + JSON.stringify(data));
                        },
                        error: function() {
                            console.log("couldn't get device info from server, retrying in a few moment");
                            setTimeout(loadFromServer, 300);
                        }
                    });
                }
                loadFromServer();
            }
        });

        self.whenReady = function(callback) {
            if (isReady) {
                callback(self);
            } else {
                whenReadyCallbacks.push(callback);
            }
        };
    }
    Device.current = ko.observable(new Device());

    exports.models = exports.models || {};
    exports.models.Device = Device;
})(window);
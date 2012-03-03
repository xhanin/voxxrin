(function(exports) {

    var Device = function() {
        var self = this;
        self.id = ko.observable(null);

        function load(data) { self.id(data.id)}

        var devicedata = localStorage.getItem('deviceinfo');
        if (devicedata) {
            devicedata = JSON.parse(devicedata);
            load(devicedata);
            console.log('device (from ls)', devicedata);
        } else {
            $.ajax({
                url: models.baseUrl + "/devices/",
                dataType:"json",
                type: "POST",
                data: JSON.stringify({}),
                success: function(data) {
                    localStorage.setItem('deviceinfo', JSON.stringify(data));
                    load(data);
                    console.log('device (from server)', data);
                }
            });
        }
    }
    Device.current = ko.observable(new Device());

    exports.models = exports.models || {};
    exports.models.Device = Device;
})(window);
(function(exports) {
    var ds = {};
    // factories / data storage
    _(['event', 'scheduleDay', 'scheduleSlot', 'presentation', 'speaker', 'room', 'twUser'])
        .each(function(type) {
            ds[type + 'Cache'] = {};
            ds[type] = function(data) {
            return factory(ds[type + 'Cache'], type, data);
        }
    });

    function factory(cache, type, data) {
        if (!data) {
            return null;
        }
        var o;
        if (data.id) {
            o = cache[data.id];
            if (o) {
                if (o.load) { o.load(data); }
                return o;
            }
        }
        o = new models[_(type).capitalize()](data);
        if (data.id) {
            cache[data.id] = o;
        }
        return o;
    }

    exports.ds = ds;
})(window);
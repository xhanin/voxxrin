(function(exports) {
    var EV = {};
    var USER_PATTERN = /([^@\(]+)(?:\((.+)\))?@(.+)/;

    EV.toBC = function(user, v) {
        return user + '|' + v;
    }

    EV.fromBC = function(f, room) {
        var parts = f.split('|');
        var ev = {};
        if (parts.length > 2) {
            ev.room = parts[0];
            ev.user = parts[1];
            ev.value = parts[2];
        } else if (parts.length == 2) {
            ev.room = room;
            ev.user = parts[0];
            ev.value = parts[1];
        } else {
            return {user: '-', value: ''};
        }

        var m = USER_PATTERN.exec(ev.user);

        ev.userid = (m && m[1]) || ev.user;
        ev.twitterid = (m && m[2]) || '';
        ev.deviceid = (m && m[3]) || '';

        ev.isRate = ev.value.substr(0,1) === 'R' && !isNaN(Number(ev.value.substr(1)));
        if (ev.isRate) {
            ev.rateValue = ev.value.substr(1);
            ev.index = ev.rateValue;
        }
        ev.isHotFactor = ev.value.substr(0,1) === 'H';
        if (ev.isHotFactor) {
            ev.hotFactorValue = ev.value.substr(1);
        }
        ev.isFeeling = ev.value.substr(0,1) === 'F';
        if (ev.isFeeling) {
            ev.feelingValue = ev.value.substr(1);
            ev.index = {'A':1, 'Y':2, 'W':3}[ev.feelingValue];
        }
        ev.isConnection = ev.value.substr(0,1) === 'C';
        if (ev.isConnection) {
            ev.connections = ev.value.substr(1);
        }
        ev.isTitle = ev.value.substr(0,1) === 'T';
        if (ev.isTitle) {
            ev.title = ev.value.substr(1);
        }
        ev.isPollStart = ev.value.substr(0,2) === 'PS';
        if (ev.isPollStart) {
            ev.items = ev.value.substr(2).split(',');
        }
        ev.isPollEnd = ev.value.substr(0,2) === 'PE';
        ev.isPollVote = ev.value.substr(0,2) === 'PV';
        if (ev.isPollVote) {
            ev.vote = ev.value.substr(2);
        }

        ev.isPrezStart = ev.value.substr(0,3) === 'PZS';
        ev.isPrezEnd = ev.value.substr(0,3) === 'PZE';

        ev.isPoke = ev.value.substr(0,2) === 'PK';
        if (ev.isPoke) {
            var parts = ev.value.substr(2).split(',');
            ev.toUser = parts[0];
            ev.msg = parts[1];
        }

        ev.isIn = ev.value.substr(0,2) === 'IN';
        if (ev.isIn) {
            ev.myPres = JSON.parse(ev.value.substr(2));
        }
        ev.isOut = ev.value.substr(0,3) === 'OUT';
        if (ev.isOut) {
            ev.userid = ev.value.substr(3);
        }

        return ev;
    }

    exports.models = exports.models || {};
    exports.models.EV = EV;
})(window);
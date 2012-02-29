(function(exports) {
    var EV = {};

    EV.toBC = function(user, v) {
        return user + '|' + v;
    }

    EV.fromBC = function(f, room) {
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
        feedback.isFeeling = feedback.value.substr(0,1) === 'F';
        if (feedback.isFeeling) {
            feedback.feelingValue = feedback.value.substr(1);
            feedback.index = {'A':1, 'Y':2, 'W':3}[feedback.feelingValue];
        }
        feedback.isConnection = feedback.value.substr(0,1) === 'C';
        if (feedback.isConnection) {
            feedback.connections = feedback.value.substr(1);
        }
        feedback.isTitle = feedback.value.substr(0,1) === 'T';
        if (feedback.isTitle) {
            feedback.title = feedback.value.substr(1);
        }
        feedback.isPollStart = feedback.value.substr(0,2) === 'PS';
        if (feedback.isPollStart) {
            feedback.items = feedback.value.substr(2).split(',');
        }
        feedback.isPollEnd = feedback.value.substr(0,2) === 'PE';

        return feedback;
    }

    exports.models = exports.models || {};
    exports.models.EV = EV;
})(window);
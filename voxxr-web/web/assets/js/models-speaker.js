(function(exports) {

    var Speaker = function(data) {
        var self = this;
        self.id = ko.observable();
        self.uri = ko.observable();
        self.name = ko.observable();
        self.pictureURI = ko.observable();
        self.pictureURL = ko.computed(function() {
            return self.pictureURI() ? (models.baseUrl + self.pictureURI()) : "";
        });
        self.firstName = ko.observable();
        self.lastName = ko.observable();
        self.bio = ko.observable();
        self.loading = ko.observable(false);
        self.data = {};

        function loadData(data) {
            self.data = _.extend(self.data, data);
            self.id(self.data.id);
            self.uri(self.data.uri);
            self.name(self.data.name);
            self.pictureURI(self.data.pictureURI);
            self.firstName(self.data.firstName);
            self.lastName(self.data.lastName);
            self.bio(self.data.bio);
            self.loading(false);
        }

        function load(data) {
            if (data) {
                loadData(data);
            } else {
                if (!self.bio()) {
                    self.loading(true);
                    getJSON(self.uri(), function(data) {
                       loadData(data);
                    });
                }
            }
        }

        self.load = load;

        loadData(data);
    }

    exports.models = exports.models || {};
    exports.models.Speaker = Speaker;
})(window);
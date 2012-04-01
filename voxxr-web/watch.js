var fs = require('fs');
var sys = require('util')
var exec = require('child_process').exec;
function puts(error, stdout, stderr) { sys.puts(stdout) }

var watcher = null;
function watch() {
    watcher = fs.watch('web/assets/css/voxxr.less', function() {
        console.log('voxxr.less change detected');
        exec("ant lessc", puts);
        rewatch();
    })
}

function rewatch() {
    if (watcher) watcher.close();
    watch();
}

watch();
console.log('watching...');
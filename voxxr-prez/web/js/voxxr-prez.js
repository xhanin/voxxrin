function ppm(msg) {
    if (window.parent) {
        window.parent.postMessage(msg, "*");
    }
}
function fppm(msg) {
    return function() { ppm(msg) }
}
function onEnterIn(slide, callback) {
    window[slide + 'Enter'] = callback;
}
function onLeaveFrom(slide, callback) {
    window[slide + 'Leave'] = callback;
}

$(function() {
    $("textarea.code").each(function() {
        CodeMirror.fromTextArea(this, {
          lineNumbers: true, theme: 'cobalt'
        });
    });
});

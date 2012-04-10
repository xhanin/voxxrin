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
        var mode = $(this).attr('data-mode') || 'javascript';
        CodeMirror.fromTextArea(this, {
          lineNumbers: true, mode: mode
        });
    });
});

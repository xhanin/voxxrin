/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*
 * $ Stream @VERSION
 * Comet Streaming JavaScript Library
 * http://code.google.com/p/jquery-stream/
 *
 * Copyright 2011, Donghwan Kim
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Compatible with $ 1.5+
 */
$.atmosphere = function() {
    var activeRequest;
    var ieStream;
    $(window).unload(function() {
        if (activeRequest) {
            activeRequest.abort();
        }
    });

    return {
        version : 0.8,
        response : {
            status: 200,
            responseBody : '',
            headers : [],
            state : "messageReceived",
            transport : "polling",
            push : [],
            error: null,
            id : 0
        },

        request : {},
        abordingConnection: false,
        subscribed: true,
        logLevel : 'info',
        callbacks: [],
        activeTransport : null,
        websocket : null,
        uuid : 0,

        subscribe: function(url, callback, request) {
            $.atmosphere.request = $.extend({
                timeout: 300000,
                method: 'GET',
                headers: {},
                contentType : '',
                cache: true,
                async: true,
                ifModified: false,
                callback: null,
                dataType: '',
                url : url,
                data : '',
                suspend : true,
                maxRequest : 60,
                maxStreamingLength : 10000000,
                lastIndex : 0,
                logLevel : 'info',
                requestCount : 0,
                fallbackMethod: 'GET',
                fallbackTransport : 'streaming',
                transport : 'long-polling',
                webSocketImpl: null,
                webSocketUrl: null,
                webSocketPathDelimiter: "@@",
                enableXDR : false,
                rewriteURL : false,
                attachHeadersAsQueryString : false,
                executeCallbackBeforeReconnect : true,
                readyState : 0

            }, request);

            logLevel = $.atmosphere.request.logLevel;
            if (callback != null) {
                $.atmosphere.addCallback(callback);
            }

            if ($.atmosphere.request.transport != $.atmosphere.activeTransport) {
                $.atmosphere.closeSuspendedConnection();
            }
            $.atmosphere.activeTransport = $.atmosphere.request.transport;

            if ($.atmosphere.uuid == 0) {
                $.atmosphere.uuid = $.atmosphere.guid();
            }

            if ($.atmosphere.request.transport != 'websocket') {
                $.atmosphere.executeRequest();
            } else if ($.atmosphere.request.transport == 'websocket') {
                if ($.atmosphere.request.webSocketImpl == null && !window.WebSocket && !window.MozWebSocket) {
                    $.atmosphere.log(logLevel, ["Websocket is not supported, using request.fallbackTransport ("
                        + $.atmosphere.request.fallbackTransport + ")"]);
                    $.atmosphere.request.transport = $.atmosphere.request.fallbackTransport;
                    $.atmosphere.response.transport = $.atmosphere.request.fallbackTransport;
                    $.atmosphere.executeRequest();
                }
                else {
                    $.atmosphere.executeWebSocket();
                }
            }
        },

        /**
         * Always make sure one transport is used, not two at the same time except for Websocket.
         */
        closeSuspendedConnection : function () {
            $.atmosphere.abordingConnection = true;
            if (activeRequest != null) {
                activeRequest.abort();
            }

            if ($.atmosphere.websocket != null) {
                $.atmosphere.websocket.close();
                $.atmosphere.websocket = null;
            }
            $.atmosphere.abordingConnection = false;

        },

        executeRequest: function() {

            if ($.atmosphere.request.transport == 'streaming') {
                if ($.browser.msie) {
                    $.atmosphere.request.enableXDR && window.XDomainRequest ? $.atmosphere.ieXDR() : $.atmosphere.ieStreaming();
                    return;
                }
            }

            if ($.atmosphere.request.enableXDR && window.XDomainRequest) {
                $.atmosphere.ieXDR();
                return;
            }

            if ($.atmosphere.request.requestCount++ < $.atmosphere.request.maxRequest) {
                $.atmosphere.response.push = function (url) {
                    $.atmosphere.request.callback = null;
                    $.atmosphere.publish(url, null, $.atmosphere.request);
                };

                var request = $.atmosphere.request;
                var response = $.atmosphere.response;
                if (request.transport != 'polling') {
                    response.transport = request.transport;
                }

                var ajaxRequest;
                var error = false;
                if ($.browser.msie) {
                    var activexmodes = ["Msxml2.XMLHTTP", "Microsoft.XMLHTTP"];
                    for (var i = 0; i < activexmodes.length; i++) {
                        try {
                            ajaxRequest = new ActiveXObject(activexmodes[i]);
                        }
                        catch(e) {
                        }
                    }
                } else if (window.XMLHttpRequest) {
                    ajaxRequest = new XMLHttpRequest();
                }

                if (request.suspend) {
                    activeRequest = ajaxRequest;
                }

                $.atmosphere.doRequest(ajaxRequest, request)

                if (!$.browser.msie) {
                    ajaxRequest.onerror = function() {
                        error = true;
                        try {
                            response.status = XMLHttpRequest.status;
                        }
                        catch(e) {
                            response.status = 404;
                        }

                        response.state = "error";
                        $.atmosphere.invokeCallback(response);
                        ajaxRequest.abort();
                        activeRequest = null;
                    };


                }

                ajaxRequest.onreadystatechange = function() {
                    if ($.atmosphere.abordingConnection) return;

                    var junkForWebkit = false;
                    var update = false;

                    // Remote server disconnected us, reconnect.
                    if (request.transport != 'polling' && (request.readyState == 2 && ajaxRequest.readyState == 4)) {
                        $.atmosphere.reconnect(ajaxRequest, request);
                    }
                    request.readyState = ajaxRequest.readyState;

                    if (ajaxRequest.readyState == 4) {
                        if ($.browser.msie) {
                            update = true;
                        } else if (request.transport == 'streaming') {
                            update = true;
                        }
                    } else if (!$.browser.msie && ajaxRequest.readyState == 3 && ajaxRequest.status == 200) {
                        update = true;
                    } else {
                        clearTimeout(request.id);
                    }

                    if (update) {
                        var responseText = ajaxRequest.responseText;
                        this.previousLastIndex = request.lastIndex;
                        if (request.transport == 'streaming') {
                            response.responseBody = responseText.substring(request.lastIndex, responseText.length);
                            response.isJunkEnded = true;

                            if (request.lastIndex == 0 && response.responseBody.indexOf("<!-- Welcome to the Atmosphere Framework.") != -1) {
                                response.isJunkEnded = false;
                            }

                            if (!response.isJunkEnded) {
                                var endOfJunk = "<!-- EOD -->";
                                var endOfJunkLenght = endOfJunk.length;
                                var junkEnd = response.responseBody.indexOf(endOfJunk) + endOfJunkLenght;

                                if (junkEnd > endOfJunkLenght && junkEnd != response.responseBody.length) {
                                    response.responseBody = response.responseBody.substring(junkEnd);
                                } else {
                                    junkForWebkit = true;
                                }
                            } else {
                                response.responseBody = responseText.substring(request.lastIndex, responseText.length);
                            }
                            request.lastIndex = responseText.length;

                            if ($.browser.opera) {
                                $.atmosphere.iterate(function() {
                                    if (ajaxRequest.responseText.length > request.lastIndex) {
                                        try {
                                            response.status = ajaxRequest.status;
                                            response.headers = ajaxRequest.getAllResponseHeaders();
                                        }
                                        catch(e) {
                                            response.status = 404;
                                        }
                                        response.state = "messageReceived";
                                        response.responseBody = ajaxRequest.responseText.substring(request.lastIndex);
                                        request.lastIndex = ajaxRequest.responseText.length;

                                        $.atmosphere.invokeCallback(response);
                                        if ((request.transport == 'streaming') && (ajaxRequest.responseText.length > $.atmosphere.request.maxStreamingLength)) {
                                            // Close and reopen connection on large data received
                                            ajaxRequest.abort();
                                            $.atmosphere.doRequest(ajaxRequest, request);
                                        }
                                    }
                                }, 0);
                            }

                            if (junkForWebkit) return;
                        } else {
                            response.responseBody = responseText;
                            request.lastIndex = responseText.length;
                        }

                        try {
                            response.status = ajaxRequest.status;
                            response.headers = ajaxRequest.getAllResponseHeaders();
                        }
                        catch(e) {
                            response.status = 404;
                        }

                        if (request.suspend) {
                            response.state = "messageReceived";
                        } else {
                            response.state = "messagePublished";
                        }

                        if (request.executeCallbackBeforeReconnect) {
                            $.atmosphere.reconnect(ajaxRequest, request);
                        }

                        // For backward compatibility with Atmosphere < 0.8
                        if (response.responseBody.indexOf("parent.callback") != -1) {
                            $.atmosphere.log(logLevel, ["parent.callback no longer supported with 0.8 version and up. Please upgrade"]);
                        }
                        $.atmosphere.invokeCallback(response);

                        if (!request.executeCallbackBeforeReconnect) {
                            $.atmosphere.reconnect(ajaxRequest, request);
                        }

                        if ((request.transport == 'streaming') && (responseText.length > $.atmosphere.request.maxStreamingLength)) {
                            // Close and reopen connection on large data received
                            ajaxRequest.abort();
                            $.atmosphere.doRequest(ajaxRequest, request);
                        }
                    }
                };
                ajaxRequest.send(request.data);

                if (request.suspend) {
                    request.id = setTimeout(function() {
                        ajaxRequest.abort();
                        $.atmosphere.subscribe(request.url, null, request);

                    }, request.timeout);
                }
                $.atmosphere.subscribed = true;
            } else {
                $.atmosphere.log(logLevel, ["Max re-connection reached."]);
            }
        },

        doRequest : function(ajaxRequest, request) {
            // Prevent Android to cacbe request
            var url = $.atmosphere.prepareURL(request.url);

            ajaxRequest.open(request.method, url, true);
            ajaxRequest.setRequestHeader("X-Atmosphere-Framework", $.atmosphere.version);
            ajaxRequest.setRequestHeader("X-Atmosphere-Transport", request.transport);
            ajaxRequest.setRequestHeader("X-Cache-Date", new Date().getTime());

            if ($.atmosphere.request.contentType != '') {
                ajaxRequest.setRequestHeader("Content-Type", $.atmosphere.request.contentType);
            }
            ajaxRequest.setRequestHeader("X-Atmosphere-tracking-id", $.atmosphere.uuid);

            for (var x in request.headers) {
                ajaxRequest.setRequestHeader(x, request.headers[x]);
            }
        },

        reconnect : function (ajaxRequest, request) {
            $.atmosphere.request = request;
            if (request.suspend && ajaxRequest.status == 200 && request.transport != 'streaming') {
                $.atmosphere.request.method = 'GET';
                $.atmosphere.request.data = "";
                $.atmosphere.executeRequest();
            }
        },

        attachHeaders : function(request) {
            var url = request.url;

            if (!request.attachHeadersAsQueryString) return url;

            url += "?X-Atmosphere-tracking-id=" + $.atmosphere.uuid;
            url += "&X-Atmosphere-Framework=" + $.atmosphere.version;
            url += "&X-Atmosphere-Transport=" + request.transport;
            url += "&X-Cache-Date=" + new Date().getTime();

            if ($.atmosphere.request.contentType != '') {
                url += "&Content-Type=" + $.atmosphere.request.contentType;
            }

            for (var x in request.headers) {
                url += "&" + x + "=" + request.headers[x];
            }

            return url;
        },

        // From jquery-stream, which is APL2 licensed as well.
        ieStreaming : function() {
            ieStream = $.atmosphere.configureIE();
            ieStream.open();
        },

        configureIE : function() {
            var stop,
                doc = new window.ActiveXObject("htmlfile");

            doc.open();
            doc.close();

            var url = $.atmosphere.request.url;
            $.atmosphere.response.push = function(url) {
                $.atmosphere.request.callback = null;
                $.atmosphere.publish(url, null, $.atmosphere.request);
            };
            var request = $.atmosphere.request;

            if (request.transport != 'polling') {
                $.atmosphere.response.transport = request.transport;
            }
            return {
                open: function() {
                    var iframe = doc.createElement("iframe");
                    if (request.method == 'POST') {
                        url = $.atmosphere.attachHeaders(request);
                        url += "&X-Atmosphere-Post-Body=" + $.atmosphere.request.data;
                    }

                    // Finally attach a timestamp to prevent Android and IE caching.
                    url = $.atmosphere.prepareURL(url);

                    iframe.src = url;
                    doc.body.appendChild(iframe);

                    // For the server to respond in a consistent format regardless of user agent, we polls response text
                    var cdoc = iframe.contentDocument || iframe.contentWindow.document;

                    stop = $.atmosphere.iterate(function() {
                        if (!cdoc.firstChild) {
                            return;
                        }

                        // Detects connection failure
                        if (cdoc.readyState === "complete") {
                            try {
                                $.noop(cdoc.fileSize);
                            } catch(e) {
                                $.atmosphere.ieCallback("Connection Failure", "error", 500, request.transport);
                                return false;
                            }
                        }

                        var res = cdoc.body ? cdoc.body.lastChild : cdoc,
                            readResponse = function() {
                                // Clones the element not to disturb the original one
                                var clone = res.cloneNode(true);

                                // If the last character is a carriage return or a line feed, IE ignores it in the innerText property
                                // therefore, we add another non-newline character to preserve it
                                clone.appendChild(cdoc.createTextNode("."));

                                var text = clone.innerText;
                                var isJunkEnded = true;

                                if (text.indexOf("<!-- Welcome to the Atmosphere Framework.") == -1) {
                                    isJunkEnded = false;
                                }

                                if (isJunkEnded) {
                                    var endOfJunk = "<!-- EOD -->";
                                    var endOfJunkLenght = endOfJunk.length;
                                    var junkEnd = text.indexOf(endOfJunk) + endOfJunkLenght;

                                    text = text.substring(junkEnd);
                                }
                                return text.substring(0, text.length - 1);
                            };

                        //To support text/html content type
                        if (!$.nodeName(res, "pre")) {
                            // Injects a plaintext element which renders text without interpreting the HTML and cannot be stopped
                            // it is deprecated in HTML5, but still works
                            var head = cdoc.head || cdoc.getElementsByTagName("head")[0] || cdoc.documentElement || cdoc,
                                script = cdoc.createElement("script");

                            script.text = "document.write('<plaintext>')";

                            head.insertBefore(script, head.firstChild);
                            head.removeChild(script);

                            // The plaintext element will be the response container
                            res = cdoc.body.lastChild;
                        }

                        // Handles open event
                        $.atmosphere.ieCallback(readResponse(), "messageReceived", 200, request.transport);

                        // Handles message and close event
                        stop = $.atmosphere.iterate(function() {
                            var text = readResponse();
                            if (text.length > request.lastIndex) {
                                $.atmosphere.response.status = 200;
                                $.atmosphere.ieCallback(text, "messageReceived", 200, request.transport);

                                // Empties response every time that it is handled
                                res.innerText = "";
                                request.lastIndex = 0;
                            }

                            if (cdoc.readyState === "complete") {
                                $.atmosphere.ieCallback("", "completed", 200, request.transport);
                                return false;
                            }
                        }, null);

                        return false;
                    });
                },

                close: function() {
                    if (stop) {
                        stop();
                    }

                    doc.execCommand("Stop");
                    $.atmosphere.ieCallback("", "closed", 200, request.transport);
                }

            };
        },

        ieCallback : function(messageBody, state, errorCode, transport) {
            var response = $.atmosphere.response;
            response.transport = transport;
            response.status = errorCode;
            response.responseBody = messageBody;
            response.state = state;

            $.atmosphere.invokeCallback(response);
        }
        ,

        // From jquery-stream, which is APL2 licensed as well.
        ieXDR : function() {
            ieStream = $.atmosphere.configureXDR();
            ieStream.open();
        },

        // From jquery-stream
        configureXDR: function() {
            var lastMessage = "";
            var transport = $.atmosphere.request.transport;
            var lastIndex = 0;

            $.atmosphere.response.push = function(url) {
                $.atmosphere.request.callback = null;
                $.atmosphere.publish(url, null, $.atmosphere.request);
            };

            var xdrCallback = function (xdr) {
                var responseBody = xdr.responseText;
                var isJunkEnded = false;

                if (responseBody.indexOf("<!-- Welcome to the Atmosphere Framework.") != -1) {
                    isJunkEnded = true;
                }

                if (isJunkEnded) {
                    var endOfJunk = "<!-- EOD -->";
                    var endOfJunkLenght = endOfJunk.length;
                    var junkEnd = responseBody.indexOf(endOfJunk) + endOfJunkLenght;

                    responseBody = responseBody.substring(junkEnd + lastIndex);
                    lastIndex += responseBody.length;
                }

                $.atmosphere.ieCallback(responseBody, "messageReceived", 200, transport);
            };

            var xdr = new window.XDomainRequest(),
                rewriteURL = $.atmosphere.request.rewriteURL || function(url) {
                    // Maintaining session by rewriting URL
                    // http://stackoverflow.com/questions/6453779/maintaining-session-by-rewriting-url
                    var rewriters = {
                        JSESSIONID: function(sid) {
                            return url.replace(/;jsessionid=[^\?]*|(\?)|$/, ";jsessionid=" + sid + "$1");
                        },
                        PHPSESSID: function(sid) {
                            return url.replace(/\?PHPSESSID=[^&]*&?|\?|$/, "?PHPSESSID=" + sid + "&").replace(/&$/, "");
                        }
                    };

                    for (var name in rewriters) {
                        // Finds session id from cookie
                        var matcher = new RegExp("(?:^|;\\s*)" + encodeURIComponent(name) + "=([^;]*)").exec(document.cookie);
                        if (matcher) {
                            return rewriters[name](matcher[1]);
                        }
                    }

                    return url;
                };

            // Handles open and message event
            xdr.onprogress = function() {
                xdrCallback(xdr);
            };
            // Handles error event
            xdr.onerror = function() {
                $.atmosphere.ieCallback(xdr.responseText, "error", 500, transport);
            };
            // Handles close event
            xdr.onload = function() {
                if (lastMessage != xdr.responseText) {
                    xdrCallback(xdr);
                }

                $.atmosphere.reconnect(xdr, $.atmosphere.request);
            };

            return {
                open: function() {
                    var url = $.atmosphere.attachHeaders($.atmosphere.request);
                    if ($.atmosphere.request.method == 'POST') {
                        url += "&X-Atmosphere-Post-Body=" + $.atmosphere.request.data;
                    }
                    xdr.open($.atmosphere.request.method, rewriteURL(url));
                    xdr.send();
                },
                close: function() {
                    xdr.abort();
                    $.atmosphere.ieCallback(xdr.responseText, "closed", 200, transport);
                }
            };
        },

        executeWebSocket : function() {
            var request = $.atmosphere.request;
            var webSocketSupported = false;
            var url = $.atmosphere.request.url;
            url = $.atmosphere.attachHeaders($.atmosphere.request);
            var callback = $.atmosphere.request.callback;

            $.atmosphere.log(logLevel, ["Invoking executeWebSocket"]);
            $.atmosphere.response.transport = "websocket";

            if (url.indexOf("http") == -1 && url.indexOf("ws") == -1) {
                url = $.atmosphere.parseUri(document.location, url);
                $.atmosphere.debug("Using URL: " + url);
            }
            var location = url.replace('http:', 'ws:').replace('https:', 'wss:');

            var websocket = null;
            if ($.atmosphere.request.webSocketImpl != null) {
                websocket = $.atmosphere.request.webSocketImpl;
            } else {
                if (window.WebSocket) {
                    websocket = new WebSocket(location);
                } else {
                    websocket = new MozWebSocket(location);
                }
            }

            $.atmosphere.websocket = websocket;

            $.atmosphere.response.push = function (url) {
                var data;
                try {
                    if ($.atmosphere.request.webSocketUrl != null) {
                        data = $.atmosphere.request.webSocketPathDelimiter
                            + $.atmosphere.request.webSocketUrl
                            + $.atmosphere.request.webSocketPathDelimiter
                            + $.atmosphere.request.data;
                    } else {
                        data = $.atmosphere.request.data;
                    }

                    websocket.send(data);
                } catch (e) {
                    $.atmosphere.log(logLevel, ["Websocket failed. Downgrading to Comet and resending " + data]);
                    // Websocket is not supported, reconnect using the fallback transport.
                    request.transport = request.fallbackTransport;
                    request.method = request.fallbackMethod;
                    request.data = data;
                    $.atmosphere.response.transport = request.fallbackTransport;
                    $.atmosphere.request = request;
                    $.atmosphere.executeRequest();

                    websocket.onclose = function(message) {
                    };
                    websocket.close();
                }
            };

            websocket.onopen = function(message) {
                $.atmosphere.subscribed = true;
                $.atmosphere.debug("Websocket successfully opened");
                webSocketSupported = true;
                $.atmosphere.response.state = 'opening';
                $.atmosphere.invokeCallback($.atmosphere.response);

                if ($.atmosphere.request.method == 'POST') {
                    data = $.atmosphere.request.data;
                    $.atmosphere.response.state = 'messageReceived';
                    websocket.send($.atmosphere.request.data);
                }
            };

            websocket.onmessage = function(message) {
                if (message.data.indexOf("parent.callback") != -1) {
                    $.atmosphere.log(logLevel, ["parent.callback no longer supported with 0.8 version and up. Please upgrade"]);

                }
                $.atmosphere.response.state = 'messageReceived';
                $.atmosphere.response.responseBody = message.data;
                $.atmosphere.invokeCallback($.atmosphere.response);
            };

            websocket.onerror = function(message) {
                $.atmosphere.warn("Websocket error, reason: " + message.reason);
                $.atmosphere.response.state = 'error';
                $.atmosphere.response.responseBody = "";
                $.atmosphere.response.status = 500;
                $.atmosphere.invokeCallback($.atmosphere.response);
            };

            websocket.onclose = function(message) {
                var reason = message.reason
                if (reason === "") {
                    switch (message.code) {
                        case 1000:
                            reason = "Normal closure; the connection successfully completed whatever purpose for which " +
                                "it was created.";
                            break;
                        case 1001:
                            reason = "The endpoint is going away, either because of a server failure or because the " +
                                "browser is navigating away from the page that opened the connection."
                            break;
                        case 1002:
                            reason = "The endpoint is terminating the connection due to a protocol error."
                            break;
                        case 1003:
                            reason = "The connection is being terminated because the endpoint received data of a type it " +
                                "cannot accept (for example, a text-only endpoint received binary data)."
                            break;
                        case 1004:
                            reason = "The endpoint is terminating the connection because a data frame was received that " +
                                "is too large."
                            break;
                        case 1005:
                            reason = "Unknown: no status code was provided even though one was expected."
                            break;
                        case 1006:
                            reason = "Connection was closed abnormally (that is, with no close frame being sent)."
                            break;
                    }
                }
                $.atmosphere.warn("Websocket closed, reason: " + reason);
                $.atmosphere.warn("Websocket closed, wasClean: " + message.wasClean);

                if (!webSocketSupported) {
                    var data = $.atmosphere.request.data;
                    $.atmosphere.log(logLevel, ["Websocket failed. Downgrading to Comet and resending " + data]);
                    // Websocket is not supported, reconnect using the fallback transport.
                    request.transport = request.fallbackTransport;
                    request.method = request.fallbackMethod;
                    request.data = data;
                    $.atmosphere.response.transport = request.fallbackTransport;

                    $.atmosphere.request = request;
                    $.atmosphere.executeRequest();
                } else if ($.atmosphere.subscribed && $.atmosphere.response.transport == 'websocket') {

                    if (request.requestCount++ < request.maxRequest) {
                        $.atmosphere.request.requestCount = request.requestCount;
                        $.atmosphere.request.maxRequest = request.maxRequest;

                        $.atmosphere.request.url = request.url;

                        $.atmosphere.response.responseBody = "";
                        $.atmosphere.executeWebSocket();
                    } else {
                        $.atmosphere.log(logLevel, ["Websocket reconnect maximum try reached "
                            + request.requestCount]);
                    }
                }
            };
        }
        ,

        addCallback: function(func) {
            if ($.atmosphere.callbacks.indexOf(func) == -1) {
                $.atmosphere.callbacks.push(func);
            }
        }
        ,

        removeCallback: function(func) {
            var index = $.atmosphere.callbacks.indexOf(func);
            if (index != -1) {
                $.atmosphere.callbacks.splice(index);
            }
        }
        ,

        invokeCallback: function(response) {
            var call = function (index, func) {
                func(response);
            };

            // Invoke global callbacks
            // $.atmosphere.log(logLevel, ["Invoking " + $.atmosphere.callbacks.length + " callbacks"]);
            if ($.atmosphere.callbacks.length > 0) {
                $.each($.atmosphere.callbacks, call);
            }
            // Invoke request callback
            if (typeof($.atmosphere.request.callback) == 'function') {
                $.atmosphere.request.callback(response);
            }
        }
        ,

        publish: function(url, callback, request) {
            $.atmosphere.request = $.extend({
                connected: false,
                timeout: 60000,
                method: 'POST',
                contentType : '',
                headers: {},
                cache: true,
                async: true,
                ifModified: false,
                callback: null,
                dataType: '',
                url : url,
                data : '',
                suspend : false,
                maxRequest : 60,
                logLevel : 'info',
                requestCount : 0,
                transport: 'polling'
            }, request);

            if (callback != null) {
                $.atmosphere.addCallback(callback);
            }

            if ($.atmosphere.uuid == 0) {
                $.atmosphere.uuid = $.atmosphere.guid();
            }

            $.atmosphere.request.transport = 'polling';
            if ($.atmosphere.request.transport != 'websocket') {
                $.atmosphere.executeRequest();
            } else if ($.atmosphere.request.transport == 'websocket') {
                if (!window.WebSocket && !window.MozWebSocket) {
                    alert("WebSocket not supported by this browser");
                }
                else {
                    $.atmosphere.executeWebSocket();
                }
            }
        }
        ,

        unload: function (arg) {
            if (window.addEventListener) {
                document.addEventListener('unload', arg, false);
                window.addEventListener('unload', arg, false);
            } else { // IE
                document.attachEvent('onunload', arg);
                window.attachEvent('onunload', arg);
            }
        }
        ,

        log: function (level, args) {
            if (window.console) {
                var logger = window.console[level];
                if (typeof logger == 'function') {
                    logger.apply(window.console, args);
                }
            }
        }
        ,

        warn: function() {
            $.atmosphere.log('warn', arguments);
        }
        ,


        info :function() {
            if (logLevel != 'warn') {
                $.atmosphere.log('info', arguments);
            }
        }
        ,

        debug: function() {
            if (logLevel == 'debug') {
                $.atmosphere.log('debug', arguments);
            }
        }
        ,

        unsubscribe : function() {
            $.atmosphere.subscribed = false;
            $.atmosphere.closeSuspendedConnection();
            $.atmosphere.callbacks = [];
            if (ieStream != null)
                ieStream.close();
        },

        S4 : function() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        },

        guid : function() {
            return ($.atmosphere.S4() + $.atmosphere.S4() + "-" + $.atmosphere.S4() + "-" + $.atmosphere.S4() + "-" + $.atmosphere.S4() + "-" + $.atmosphere.S4() + $.atmosphere.S4() + $.atmosphere.S4());
        },

        // From $-Stream
        prepareURL: function(url) {
            // Attaches a time stamp to prevent caching
            var ts = ( new Date() ).getTime(),
                ret = url.replace(/([?&])_=[^&]*/, "$1_=" + ts);

            return ret + (ret === url ? (/\?/.test(url) ? "&" : "?") + "_=" + ts : "");
        },

        // From $-Stream
        param : function(data) {
            return $.param(data, $.ajaxSettings.traditional);
        },

        iterate : function (fn, interval) {
            var timeoutId;

            // Though the interval is 0 for real-time application, there is a delay between setTimeout calls
            // For detail, see https://developer.mozilla.org/en/window.setTimeout#Minimum_delay_and_timeout_nesting
            interval = interval || 0;

            (function loop() {
                timeoutId = setTimeout(function() {
                    if (fn() === false) {
                        return;
                    }

                    loop();
                }, interval);
            })();

            return function() {
                clearTimeout(timeoutId);
            };
        },

        parseUri : function(baseUrl, uri) {
            var protocol = window.location.protocol;
            var host = window.location.host;
            var path = window.location.pathname;
            var parameters = {};
            var anchor = '';
            var pos;

            if ((pos = uri.search(/\:/)) >= 0) {
                protocol = uri.substring(0, pos + 1);
                uri = uri.substring(pos + 1);
            }

            if ((pos = uri.search(/\#/)) >= 0) {
                anchor = uri.substring(pos + 1);
                uri = uri.substring(0, pos);
            }

            if ((pos = uri.search(/\?/)) >= 0) {
                var paramsStr = uri.substring(pos + 1) + '&;';
                uri = uri.substring(0, pos);
                while ((pos = paramsStr.search(/\&/)) >= 0) {
                    var paramStr = paramsStr.substring(0, pos);
                    paramsStr = paramsStr.substring(pos + 1);

                    if (paramStr.length) {
                        var equPos = paramStr.search(/\=/);
                        if (equPos < 0) {
                            parameters[paramStr] = '';
                        }
                        else {
                            parameters[paramStr.substring(0, equPos)] =
                                decodeURIComponent(paramStr.substring(equPos + 1));
                        }
                    }
                }
            }

            if (uri.search(/\/\//) == 0) {
                uri = uri.substring(2);
                if ((pos = uri.search(/\//)) >= 0) {
                    host = uri.substring(0, pos);
                    path = uri.substring(pos);
                }
                else {
                    host = uri;
                    path = '/';
                }
            } else if (uri.search(/\//) == 0) {
                path = uri;
            }

            else // relative to directory
            {
                var p = path.lastIndexOf('/');
                if (p < 0) {
                    path = '/';
                } else if (p < path.length - 1) {
                    path = path.substring(0, p + 1);
                }

                while (uri.search(/\.\.\//) == 0) {
                    var p = path.lastIndexOf('/', path.lastIndexOf('/') - 1);
                    if (p >= 0) {
                        path = path.substring(0, p + 1);
                    }
                    uri = uri.substring(3);
                }
                path = path + uri;
            }

            var uri = protocol + '//' + host + path;
            var div = '?';
            for (var key in parameters) {
                uri += div + key + '=' + encodeURIComponent(parameters[key]);
                div = '&';
            }
            return uri;
        }

    }

}();
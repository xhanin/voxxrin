package voxxr.web;

import org.atmosphere.cpr.AtmosphereResourceEvent;
import org.atmosphere.websocket.WebSocketEventListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class EventsLogger implements WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(EventsLogger.class);

    public EventsLogger() {
    }

    public void onSuspend(final AtmosphereResourceEvent<HttpServletRequest, HttpServletResponse> event) {
        logger.info("onSuspend(): {}:{}", event.getResource().getRequest().getRemoteAddr(),
                event.getResource().getRequest().getRemotePort());
    }

    public void onResume(AtmosphereResourceEvent<HttpServletRequest, HttpServletResponse> event) {
        logger.info("onResume(): {}:{}", event.getResource().getRequest().getRemoteAddr(),
                event.getResource().getRequest().getRemotePort());
    }

    public void onDisconnect(AtmosphereResourceEvent<HttpServletRequest, HttpServletResponse> event) {
        logger.info("onDisconnect(): {}:{}", event.getResource().getRequest().getRemoteAddr(),
                event.getResource().getRequest().getRemotePort());
    }

    public void onBroadcast(AtmosphereResourceEvent<HttpServletRequest, HttpServletResponse> event) {
        logger.info("onBroadcast(): {}", event.getMessage());
    }

    public void onThrowable(AtmosphereResourceEvent<HttpServletRequest, HttpServletResponse> event) {
        logger.warn("onThrowable(): {}", event);
    }

    public void onHandshake(WebSocketEvent event) {
        logger.info("onHandshake(): {}", event);
    }

    public void onMessage(WebSocketEvent event) {
        logger.info("onMessage(): {}", event);
    }

    public void onClose(WebSocketEvent event) {
        logger.info("onClose(): {}", event);
    }

    public void onControl(WebSocketEvent event) {
        logger.info("onControl(): {}", event);
    }

    public void onDisconnect(WebSocketEvent event) {
        logger.info("onDisconnect(): {}", event);
    }

    public void onConnect(WebSocketEvent event) {
        logger.info("onConnect(): {}", event);
    }
}
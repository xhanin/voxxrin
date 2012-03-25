package voxxr;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Properties;

/**
 * User: xavierhanin
 * Date: 2/26/12
 * Time: 11:47 AM
 */
public class Env {
    private static String room;
    private static String app;
    private static String uri;
    private static Properties properties;

    static final Logger logger = LoggerFactory.getLogger(Env.class);

    static {
        properties = new Properties();
        try {
            properties.load(Env.class.getResourceAsStream("/voxxr-room.properties"));
        } catch (IOException e) {
            throw new RuntimeException("unable to load voxxr-room.properties", e);
        }
        logger.info("voxxr-room properties: \n\n" + properties + "\n\n");
        room = properties.getProperty("room");
        app = properties.getProperty("app.uri");
        uri = properties.getProperty("uri");
    }

    public static String getRoom() {
        return room;
    }

    public static String getApp() {
        return app;
    }

    public static Properties getProperties() {
        return properties;
    }

    public static String getURI() {
        return uri;
    }
}

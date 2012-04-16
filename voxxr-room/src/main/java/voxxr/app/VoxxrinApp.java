package voxxr.app;

import us.monoid.json.JSONException;
import us.monoid.json.JSONObject;
import us.monoid.web.Resty;
import voxxr.AuthorizationToken;
import voxxr.Env;

import java.io.IOException;

import static us.monoid.web.Resty.*;

/**
 * User: xavierhanin
 * Date: 3/25/12
 * Time: 2:12 PM
 */
public class VoxxrinApp {
    /**
     * Informs voxxrin app that this room server is handling a particular room
     * @param roomId
     */
    public static void declareRoom(String roomId) {
        try {
            resty().json(Env.getApp() + "/r/rooms/" + roomId + "/rt",
                    content(new JSONObject()
                            .put("roomRT", Env.getURI())));
        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (JSONException e) {
            throw new RuntimeException(e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * Informs voxxrin app that a pres is started, which in turn returns its title.
     * @param presId
     * @return
     */
    public static String startPres(String eventId, String presId) {
        try {
            return (String) resty().json(Env.getApp() + "/r/events/" + eventId + "/nowplaying",
                    content(new JSONObject()
                            .put("id", presId)
                            .put("action", "start")
                            .put("roomRT", Env.getURI()))).get("title");
        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (JSONException e) {
            throw new RuntimeException(e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static void stopPres(String eventId, String presId) {
        try {
            resty().json(Env.getApp() + "/r/events/" + eventId + "/nowplaying",
                    content(new JSONObject()
                            .put("id", presId)
                            .put("action", "stop"))).get("id");
        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (JSONException e) {
            throw new RuntimeException(e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static Resty resty() {
        return new Resty() {
            {
                getAdditionalHeaders().put("Authorization", AuthorizationToken.TOKEN);
            }
        };
    }
}

package voxxr.web;

import com.google.appengine.api.datastore.*;
import org.json.JSONException;
import org.json.JSONObject;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

/**
 */
public class SpeakerResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        String kind = "Speaker";
        final String eventId = params.get("eventId");
        final String speakerId = params.get("speakerId");
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            Rests.sendAsJsonObject(Rests.createKey(kind, speakerId), resp);
        } else if ("POST".equalsIgnoreCase(req.getMethod())) {
            Rests.storeFromRequest(req, resp, kind, new PrepareEntityCallback() {
                @Override
                public Entity prepare(JSONObject json, Entity entity) throws JSONException {
                    return entity;
                }
            });
        }
    }
}



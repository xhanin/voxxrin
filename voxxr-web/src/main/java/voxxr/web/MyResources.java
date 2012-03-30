package voxxr.web;

import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.EntityNotFoundException;
import org.json.JSONException;
import org.json.JSONObject;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

/**
 * User: xavierhanin
 * Date: 1/28/12
 * Time: 8:51 PM
 */
public class MyResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        String kind = "My";
        User me = User.authenticate(req.getHeader("Authorization"));
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            try {
                Rests.maybeSendAsJsonObject(Rests.createKey(kind, me.getId()), req, resp);
            } catch (EntityNotFoundException e) {
                try {
                    Entity entity = newMy(me.getId());
                    Rests.sendAsJsonObject(entity, req, resp);
                } catch (JSONException e1) {
                    throw new RuntimeException(e1);
                }
            }
        } else if ("POST".equalsIgnoreCase(req.getMethod())) {
            try {
                JSONObject json = Rests.jsonObjectFromRequest(req);
                if (!json.has("id")) {
                    json.put("id", me.getId());
                }
                Entity entity = Rests.storeFromJSON(json, kind, new PrepareEntityCallback() {
                    @Override
                    public Entity prepare(JSONObject json, Entity entity) throws JSONException {
                        return entity;
                    }
                });
                Rests.sendAsJsonObject(entity, req, resp);
            } catch (JSONException e) {
                throw new RuntimeException(e);
            }
        }
    }

    public static Entity newMy(String me) throws JSONException {
        String kind = "My";
        JSONObject json = new JSONObject();
        json.put("id", me);
        json.put("events", new JSONObject());
        return Rests.storeFromJSON(json, kind, new PrepareEntityCallback() {
            @Override
            public Entity prepare(JSONObject json, Entity entity) throws JSONException {
                return entity;
            }
        });
    }
}

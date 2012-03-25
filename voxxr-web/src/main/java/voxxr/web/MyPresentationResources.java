package voxxr.web;

import com.google.appengine.api.datastore.*;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;
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
public class MyPresentationResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        String kind = "MyPresentation";
        final String me = req.getHeader("Authorization");
        final String eventId = params.get("eventId");
        final String presId = params.get("presentationId");
        String id = me + "/" + eventId + "/" + presId;
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            try {
                Rests.maybeSendAsJsonObject(Rests.createKey(kind, id), resp);
            } catch (EntityNotFoundException e) {
                JSONObject json = new JSONObject();
                try {
                    json.put("id", id);
                    json.put("eventId", eventId);
                    json.put("presId", presId);
                    json.put("me", me);
                    json.put("favorite", false);
                    Entity entity = Rests.storeFromJSON(json, kind, new PrepareEntityCallback() {
                        @Override
                        public Entity prepare(JSONObject json, Entity entity) throws JSONException {
                            return entity;
                        }
                    });
                    Rests.sendAsJsonObject(entity, resp);
                } catch (JSONException e1) {
                    throw new RuntimeException(e1);
                }
            }
        } else if ("POST".equalsIgnoreCase(req.getMethod())) {
            try {
                JSONObject json = Rests.jsonObjectFromRequest(req);
                if (!json.has("id")) {
                    json.put("id", id);
                }
                Entity entity = Rests.storeFromJSON(json, kind, new PrepareEntityCallback() {
                    @Override
                    public Entity prepare(JSONObject json, Entity entity) throws JSONException {
                        entity.setProperty("eventId", eventId);
                        entity.setProperty("presId", presId);
                        entity.setProperty("me", me);
                        entity.setProperty("favorite", json.get("favorite"));
                        return entity;
                    }
                });

                try {
                    // maybe this should go into MyResources
                    DatastoreService ds = DatastoreServiceFactory.getDatastoreService();
                    Entity my = ds.get(Rests.createKey("My", me));
                    String myJsonStr = ((Text) my.getProperty("json")).getValue();
                    JSONObject myJson = new JSONObject(myJsonStr);
                    JSONObject events = myJson.getJSONObject("events");
                    if (!events.has(eventId)) {
                        JSONObject jsonEvent = new JSONObject();
                        jsonEvent.put("presentations", new JSONObject());
                        events.put(eventId, jsonEvent);
                    }
                    events.getJSONObject(eventId).getJSONObject("presentations").put(presId, json);
                    my.setProperty("json", new Text(myJson.toString()));
                    ds.put(my);
                    MemcacheService memcache = MemcacheServiceFactory.getMemcacheService("entities");
                    String cacheKey = KeyFactory.keyToString(my.getKey());
                    memcache.put(cacheKey, my);
                } catch (EntityNotFoundException e) {
                    throw new RuntimeException(e);
                }

                Rests.sendAsJsonObject(entity, resp);
            } catch (JSONException e) {
                throw new RuntimeException(e);
            }
        }
    }
}

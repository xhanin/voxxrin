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
        final User me = User.authenticate(req.getHeader("Authorization"));
        final String eventId = params.get("eventId");
        final String presId = params.get("presentationId");
        String id = me.getId() + "/" + eventId + "/" + presId;
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            try {
                Rests.maybeSendAsJsonObject(Rests.createKey(kind, id), req, resp);
            } catch (EntityNotFoundException e) {
                JSONObject json = new JSONObject();
                try {
                    json.put("id", id);
                    json.put("eventId", eventId);
                    json.put("presId", presId);
                    json.put("me", me.getId());
                    json.put("favorite", false);
                    Entity entity = Rests.storeFromJSON(json, kind, new PrepareEntityCallback() {
                        @Override
                        public Entity prepare(JSONObject json, Entity entity) throws JSONException {
                            return entity;
                        }
                    });
                    Rests.sendAsJsonObject(entity, req, resp);
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
                        entity.setProperty("me", me.getId());
                        entity.setProperty("device", me.getDeviceid());
                        entity.setProperty("twitterid", me.getTwitterid());
                        entity.setProperty("favorite", json.get("favorite"));
                        return entity;
                    }
                });

                // maybe this should go into MyResources
                Entity my = null;
                DatastoreService ds = DatastoreServiceFactory.getDatastoreService();
                try {
                    my = ds.get(Rests.createKey("My", me.getId()));
                } catch (EntityNotFoundException e) {
                    my = MyResources.newMy(me.getId());
                }
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

                Rests.sendAsJsonObject(entity, req, resp);
            } catch (JSONException e) {
                throw new RuntimeException(e);
            }
        }
    }
}

package voxxr.web;

import com.google.appengine.api.datastore.*;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;
import org.json.JSONException;
import org.json.JSONObject;
import voxxr.web.twitter.CallbackTwitter;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.logging.Logger;

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
            if (me.isAnonymous()) {
                User user = CallbackTwitter.authenticatedFromTwitter(me.getDeviceid());
                if (user != null) {
                    Logger.getLogger("My").info("twitter authentication associated to My for " + user);
                    me = user;
                }
            }
            try {
                Rests.maybeSendAsJsonObject(Rests.createKey(kind, me.getId()), req, resp);
            } catch (EntityNotFoundException e) {
                try {
                    Entity entity = newMy(me);
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

    public static Entity newMy(User me) throws JSONException {
        String kind = "My";
        JSONObject json = new JSONObject();
        json.put("id", me.getId());
        json.put("twitterid", me.getTwitterid());
        json.put("deviceid", me.getDeviceid());
        json.put("events", new JSONObject());
        return Rests.storeFromJSON(json, kind, new PrepareEntityCallback() {
            @Override
            public Entity prepare(JSONObject json, Entity entity) throws JSONException {
                return entity;
            }
        });
    }

    public static void updateMyPresentation(MyPresentation myPresentation) throws JSONException {
        DatastoreService ds = DatastoreServiceFactory.getDatastoreService();
        User me = myPresentation.getUser();
        String eventId = myPresentation.getEventId();
        Entity my = null;
        try {
            my = ds.get(Rests.createKey("My", me.getId()));
        } catch (EntityNotFoundException e) {
            my = MyResources.newMy(me);
        }
        String myJsonStr = ((Text) my.getProperty("json")).getValue();
        JSONObject myJson = new JSONObject(myJsonStr);
        myJson.put("lastmodified", myPresentation.getLastModified());
        JSONObject events = myJson.getJSONObject("events");
        if (!events.has(eventId)) {
            JSONObject jsonEvent = new JSONObject();
            jsonEvent.put("presentations", new JSONObject());
            events.put(eventId, jsonEvent);
        }
        events.getJSONObject(eventId).getJSONObject("presentations").put(
                myPresentation.getPresentationId(), MyPresentation.TO_JSON.apply(myPresentation));
        my.setProperty("json", new Text(myJson.toString()));
        my.setProperty("lastmodified", myPresentation.getLastModified());
        ds.put(my);
        MemcacheService memcache = MemcacheServiceFactory.getMemcacheService("entities");
        String cacheKey = KeyFactory.keyToString(my.getKey());
        memcache.put(cacheKey, my);
    }
}

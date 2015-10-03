package voxxr.web;

import com.google.appengine.api.datastore.*;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;
import com.google.appengine.repackaged.com.google.common.base.Function;
import com.google.appengine.repackaged.com.google.common.base.Optional;
import com.google.appengine.repackaged.com.google.common.collect.Lists;
import com.google.gson.Gson;
import org.json.JSONException;
import org.json.JSONObject;
import voxxr.web.twitter.CallbackTwitter;

import javax.annotation.Nullable;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 * User: xavierhanin
 * Date: 1/28/12
 * Time: 8:51 PM
 */
public class MyResources implements RestRouter.RequestHandler {

    Gson gson = new Gson();

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

            Entity my;
            try {
                my = Rests.findEntityByKey(Rests.createKey(kind, me.getId()));
            } catch (EntityNotFoundException e) {
                try {
                    my = newMy(me);
                } catch (JSONException e1) {
                    throw new RuntimeException(e1);
                }
            }

            mergeTwitterInfos(my, gson);

            Rests.sendAsJsonObject(my, req, resp);
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

    public static void mergeTwitterInfos(Entity my, Gson gson) {
        Map myMap = gson.fromJson(((Text) my.getProperty("json")).getValue(), Map.class);
        mergeTwitterInfos(myMap, gson);
        my.setProperty("json", new Text(gson.toJson(myMap)));
    }

    public static void mergeTwitterInfos(Map myMap, Gson gson) {
        if(myMap.containsKey("twitterid")) {
            Double twitterId = (Double)myMap.get("twitterid");

            for(Map jsonMatchingTwitterId : findMyJsonsMatchingTwitterId(twitterId.longValue(), gson)){
                mergeJsons(myMap, jsonMatchingTwitterId);
            }
        }
    }

    private static void mergeJsons(Map myJson, Map otherJson) {
        Map<String, Map> myEvents = extractMapProp(myJson, "events");
        Map<String, Map> otherEvents = extractMapProp(otherJson, "events");
        
        for(Map.Entry<String, Map> otherEventEntry: otherEvents.entrySet()){
            if(!myEvents.containsKey(otherEventEntry.getKey())) {
                myEvents.put(otherEventEntry.getKey(), otherEventEntry.getValue());
            } else {
                Map<String, Map> myEvent = extractMapProp(myEvents, otherEventEntry.getKey());
                Map<String, Map> otherEvent = extractMapProp(myEvents, otherEventEntry.getKey());

                Map<String, Map> myPresentations = extractMapProp(myEvent, "presentations");
                Map<String, Map> otherPresentations = extractMapProp(otherEvent, "presentations");

                for(Map.Entry<String, Map> otherPresentationEntry: otherPresentations.entrySet()) {
                    if(!myPresentations.containsKey(otherPresentationEntry.getKey())) {
                        myPresentations.put(otherPresentationEntry.getKey(), otherPresentationEntry.getValue());
                    } else {
                        // Keeping only the most recent
                        Map<String, Map> myPresentation = extractMapProp(myPresentations, otherPresentationEntry.getKey());
                        Map<String, Map> otherPresentation = extractMapProp(otherPresentations, otherPresentationEntry.getKey());

                        Double myLastModified = extractMapProp(myPresentation, "lastmodified");
                        Double otherLastModified = extractMapProp(otherPresentation, "lastmodified");

                        if(otherLastModified==null || myLastModified==null || otherLastModified.longValue() > myLastModified.longValue()) {
                            myPresentations.put(otherPresentationEntry.getKey(), otherPresentationEntry.getValue());
                        }
                    }
                }
            }
        }
    }

    private static <T> T extractMapProp(Map map, String propName) {
        return (T)map.get(propName);
    }

    private static List<Map> findMyJsonsMatchingTwitterId(Long twitterId, final Gson gson) {
        List<Entity> mys = CallbackTwitter.findMysByTwitterId(twitterId);

        return Lists.transform(mys, new Function<Entity, Map>() {
            @Nullable
            @Override
            public Map apply(Entity entity) {
                return gson.fromJson(((Text) entity.getProperty("json")).getValue(), Map.class);
            }
        });
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

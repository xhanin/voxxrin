package voxxr.web;

import com.google.appengine.api.datastore.*;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;
import com.google.common.base.CharMatcher;
import com.google.common.base.Function;
import com.google.common.base.Joiner;
import com.google.common.collect.Iterables;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

import javax.annotation.Nullable;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;

/**
 * User: xavierhanin
 * Date: 2/13/12
 * Time: 10:10 PM
 */
public class Rests {
    public static void sendAsJsonArray(Iterable<Entity> entities, HttpServletResponse resp) throws IOException {
        resp.addHeader("Content-Type", "application/json; charset=utf-8");
        resp.addHeader("Access-Control-Allow-Origin", "*");

        OutputStreamWriter writer = new OutputStreamWriter(resp.getOutputStream(), "UTF8");
        writer.append("[");
        Joiner.on(",").appendTo(writer,
                Iterables.transform(
                        entities,
                        new Function<Entity, Object>() {
                            @Override
                            public Object apply(@Nullable Entity input) {
                                return ((Text) input.getProperty("json")).getValue();
                            }
                        }));
        writer.append("]");
        writer.flush();
        writer.close();
    }

    public static void sendAsJsonObject(Key key, HttpServletResponse resp) throws IOException {
        try {
            maybeSendAsJsonObject(key, resp);
        } catch (EntityNotFoundException e) {
            resp.sendError(404);
        }
    }

    public static void maybeSendAsJsonObject(Key key, HttpServletResponse resp) throws EntityNotFoundException, IOException {
        Entity entity = findEntityByKey(key);
        sendAsJsonObject(entity, resp);
    }

    public static Entity findEntityByKey(Key key) throws EntityNotFoundException {
        MemcacheService memcache = MemcacheServiceFactory.getMemcacheService("entities");
        String cacheKey = KeyFactory.keyToString(key);
        Entity entity = (Entity) memcache.get(cacheKey);
        if (entity == null) {
            DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
            entity = datastore.get(key);
            memcache.put(cacheKey, entity);
        }
        return entity;
    }

    public static void clearEntityCache(Key key) {
        MemcacheService memcache = MemcacheServiceFactory.getMemcacheService("entities");
        String cacheKey = KeyFactory.keyToString(key);
        memcache.delete(cacheKey);
    }

    public static void sendAsJsonObject(Entity entity, HttpServletResponse resp) throws IOException {
        sendJson(((Text) entity.getProperty("json")).getValue(), resp);
    }

    public static void sendJson(String json, HttpServletResponse resp) throws IOException {
        resp.addHeader("Content-Type", "application/json; charset=utf-8");
        resp.addHeader("Access-Control-Allow-Origin", "*");

        OutputStreamWriter writer = new OutputStreamWriter(resp.getOutputStream(), "UTF8");
        writer.append(json);
        writer.flush();
        writer.close();
    }

    public static void sendImage(byte[] image, String format, HttpServletResponse resp) throws IOException {
        resp.addHeader("Content-Type", "image/" + format);
        resp.addHeader("Access-Control-Allow-Origin", "*");

        resp.getOutputStream().write(image);
        resp.getOutputStream().close();
    }

    public static void storeFromRequest(HttpServletRequest req, HttpServletResponse resp, String kind, PrepareEntityCallback callback) throws IOException {
        if (!isSecure(req)) {
            resp.sendError(403, "Unauthorized");
            return;
        }
        insecureStoreFromRequest(req, resp, kind, callback);
    }

    public static Entity insecureStoreFromRequest(HttpServletRequest req, HttpServletResponse resp, String kind, PrepareEntityCallback callback) throws IOException {
        try {
            return storeFromJSON(jsonObjectFromRequest(req), kind, callback);
        } catch (JSONException e) {
            resp.sendError(400, "Invalid json: " + e.getMessage());
            return null;
        }
    }

    public static JSONObject jsonObjectFromRequest(HttpServletRequest req) throws JSONException, IOException {
        return new JSONObject(new JSONTokener(new InputStreamReader(req.getInputStream(), "UTF8")));
    }
    public static JSONArray jsonArrayFromRequest(HttpServletRequest req) throws JSONException, IOException {
        return new JSONArray(new JSONTokener(new InputStreamReader(req.getInputStream(), "UTF8")));
    }

    public static boolean isSecure(HttpServletRequest req) {
        return "Qh12EEHzVPn2AkKfihVs".equals(req.getHeader("Authorization"));
    }

    public static Entity storeFromJSON(JSONObject json, String kind, PrepareEntityCallback callback) throws JSONException {
        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
        Entity entity = null;
        String id = json.has("id") ? json.getString("id") : null;
        if (id == null) {
            entity = new Entity(kind);
            Key key = datastore.put(entity);
            json.put("id", String.valueOf(key.getId()));
        } else {
            try {
                entity = datastore.get(createKey(kind, id));
            } catch (EntityNotFoundException e) {
                if (CharMatcher.DIGIT.matchesAllOf(id)) {
                    entity = new Entity(kind, Long.parseLong(id));
                } else {
                    entity = new Entity(kind, id);
                }
                datastore.put(entity);
            }
        }
        entity.setProperty("json", new Text(json.toString()));
        Key key = datastore.put(callback.prepare(json, entity));

        MemcacheServiceFactory.getMemcacheService("entities").delete(KeyFactory.keyToString(key));
        return entity;
    }

    public static Key createKey(String kind, String id) {
        if (CharMatcher.DIGIT.matchesAllOf(id)) {
            return KeyFactory.createKey(kind, Long.parseLong(id));
        } else {
            return KeyFactory.createKey(kind, id);
        }
    }
}

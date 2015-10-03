package voxxr.web;

import com.google.appengine.api.datastore.*;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;
import com.google.common.base.CharMatcher;
import com.google.common.base.Function;
import com.google.common.base.Joiner;
import com.google.common.collect.Collections2;
import com.google.common.collect.Iterables;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

import javax.annotation.Nullable;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.URL;
import java.net.URLConnection;
import java.util.Arrays;
import java.util.Collection;

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

    public static void sendAsJsonObject(Key key, HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            maybeSendAsJsonObject(key, req, resp);
        } catch (EntityNotFoundException e) {
            resp.sendError(404);
        }
    }

    public static void maybeSendAsJsonObject(Key key, HttpServletRequest req, HttpServletResponse resp) throws EntityNotFoundException, IOException {
        Entity entity = findEntityByKey(key);
        sendAsJsonObject(entity, req, resp);
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

    public static void sendAsJsonObject(Entity entity, HttpServletRequest req, HttpServletResponse resp) throws IOException {
        sendJson(((Text) entity.getProperty("json")).getValue(), req, resp);
    }

    public static void sendJson(JSONObject json, HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.addHeader("Content-Type", "application/json; charset=utf-8");
        if (json.has("lastmodified")) {
            try {
                // we don't use Last-Modified because browsers behave inconsistently with it
                // and have their own heuristics to use their cache depending on the date
                // we prefer to issue the request an reply with a 304
//                SimpleDateFormat format = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss zzz");
//                resp.addHeader("Last-Modified", format.format(new Date(json.getLong("lastmodified"))));

                String etag = String.valueOf(json.getLong("lastmodified"));
                if (etag.equals(req.getHeader("If-None-Match"))) {
                    resp.setStatus(304);
                    resp.getOutputStream().close();
                    return;
                }
                resp.addHeader("ETag", etag);
            } catch (JSONException e) {
                // ignore
            }
        }
        resp.addHeader("Access-Control-Allow-Origin", "*");

        OutputStreamWriter writer = new OutputStreamWriter(resp.getOutputStream(), "UTF8");
        writer.append(json.toString());
        writer.flush();
        writer.close();
    }

    public static void sendJson(String json, HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            sendJson(new JSONObject(json), req, resp);
        } catch (JSONException e) {
            resp.sendError(500);
        }
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
        return AuthorizationTokens.CRAWLER_AUTH_TOKEN.equals(req.getHeader("Authorization"));
    }

    public static Entity storeFromJSON(JSONObject json, String kind, PrepareEntityCallback callback) throws JSONException {
        String id = json.has("id") ? json.getString("id") : null;
        Entity entity = getOrCreateEntityForUpdate(kind, id);
        if (id == null) {
            json.put("id", String.valueOf(entity.getKey().getId()));
        }
        json.put("lastmodified", (Long) entity.getProperty("lastmodified"));
        entity.setProperty("json", new Text(json.toString()));

        DatastoreServiceFactory.getDatastoreService().put(callback.prepare(json, entity));
        return entity;
    }

    public static void deleteEntitiesByKeys(HttpServletRequest req, HttpServletResponse resp,
                                            final String kind, String... ids) throws IOException {
        if (!isSecure(req)) {
            resp.sendError(403, "Unauthorized");
            return;
        }
        insecureDeleteEntitiesByKeys(kind, ids);
    }

    public static void insecureDeleteEntitiesByKeys(final String kind, String... ids) {
        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
        Collection<Key> keys = Collections2.transform(Arrays.asList(ids), new Function<String, Key>() {
            @Override
            public Key apply(@Nullable String input) {
                return createKey(kind, input);
            }
        });
        datastore.delete(keys);
        for(Key key : keys){
            MemcacheServiceFactory.getMemcacheService("entities").delete(KeyFactory.keyToString(key));
        }
    }

    public static Iterable<Entity> fetchAll(String kind) {
        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
        return datastore.prepare(new Query(kind)).asIterable(FetchOptions.Builder.withChunkSize(1000));
    }

    public static Entity getOrCreateEntityForUpdate(String kind, String id) {
        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
        Entity entity = null;
        if (id == null) {
            entity = new Entity(kind);
            datastore.put(entity); // put it now to generate its key
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
        long now = System.currentTimeMillis();
        entity.setProperty("lastmodified", now);
        MemcacheServiceFactory.getMemcacheService("entities").delete(KeyFactory.keyToString(entity.getKey()));
        return entity;
    }

    public static Key createKey(String kind, String id) {
        if (CharMatcher.DIGIT.matchesAllOf(id)) {
            return KeyFactory.createKey(kind, Long.parseLong(id));
        } else {
            return KeyFactory.createKey(kind, id);
        }
    }

    public static String post(URL url, String data) throws IOException {
            // Send data
            URLConnection conn = url.openConnection();
            conn.setDoOutput(true);
            OutputStreamWriter wr = new OutputStreamWriter(conn.getOutputStream());
            wr.write(data == null ? "" : data);
            wr.flush();

            // Get the response
            BufferedReader rd = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = rd.readLine()) != null) {
                sb.append(line).append("\n");
            }
            wr.close();
            rd.close();
            return sb.toString();
    }
}

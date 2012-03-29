package voxxr.web;

import com.google.appengine.api.datastore.*;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;
import com.google.common.collect.Lists;
import org.json.JSONException;
import org.json.JSONObject;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Map;

/**
 * User: xavierhanin
 * Date: 1/28/12
 * Time: 8:51 PM
 */
public class NowPlayingResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        String eventId = params.get("eventId");
        String kind = "PresentationHeader";
        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
        MemcacheService memcache = MemcacheServiceFactory.getMemcacheService("entities");
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            Iterable<Entity> entities = (Iterable<Entity>) memcache.get("nowplaying/" + eventId);
            if (entities == null) {
                entities = datastore.prepare(new Query(kind)
                        .addFilter("nowplaying", Query.FilterOperator.EQUAL, true)
                        .addFilter("eventId", Query.FilterOperator.EQUAL, eventId))
                        .asIterable(FetchOptions.Builder.withLimit(100));
                memcache.put("nowplaying/" + eventId, new ArrayList(Lists.newArrayList(entities)));
            }
            resp.addHeader("Cache-Control", "no-cache");
            Rests.sendAsJsonArray(entities, resp);
        } else if ("POST".equalsIgnoreCase(req.getMethod())) {
            if (!Rests.isSecure(req)) {
                resp.sendError(403, "Unauthorized");
                return;
            }
            try {
                JSONObject command = Rests.jsonObjectFromRequest(req);
                String id = command.getString("id");
                String action = command.getString("action");
                try {
                    Entity entity = datastore.get(Rests.createKey(kind, id));
                    if ("start".equals(action)) {
                        entity.setProperty("nowplaying", true);
                        if (command.has("roomRT")) {
                            JSONObject json = new JSONObject(((Text) entity.getProperty("json")).getValue());
                            json.getJSONObject("room").put("rt", command.getString("roomRT"));
                            entity.setProperty("json", new Text(json.toString()));
                        }
                        System.out.println("starting " + entity);
                    } else if ("stop".equals(action)) {
                        entity.setProperty("nowplaying", false);
                    } else {
                        resp.sendError(400, "Unknwon action " + action);
                        return;
                    }
                    datastore.put(entity);
                    memcache.delete("nowplaying/" + eventId);
                    memcache.put(KeyFactory.keyToString(entity.getKey()), entity);
                    Rests.sendAsJsonObject(entity, req, resp);
                } catch (EntityNotFoundException e) {
                    resp.sendError(400, "Unknown presentation to " + action);
                }
            } catch (JSONException e) {
                resp.sendError(400, "Invalid json: " + e.getMessage());
            }
        }
    }
}



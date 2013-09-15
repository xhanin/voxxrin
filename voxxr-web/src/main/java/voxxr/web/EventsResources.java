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
public class EventsResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {

        String kind = "Event";
        MemcacheService memcache = MemcacheServiceFactory.getMemcacheService("entities");
        if ("GET".equalsIgnoreCase(req.getMethod())) {
                Iterable<Entity> entities = (Iterable<Entity>) memcache.get("events");
            if (entities == null) {
                DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
                entities = datastore.prepare(new Query(kind)
                        // Useless filter : filtering will be applied on clientside instead
                        //.addFilter("enabled", Query.FilterOperator.EQUAL, true)
                        .addSort("from"))
                        .asIterable(FetchOptions.Builder.withLimit(100));
                memcache.put("events", new ArrayList(Lists.newArrayList(entities)));
            }
            Rests.sendAsJsonArray(
                    entities, resp);
        } else if ("POST".equalsIgnoreCase(req.getMethod())) {
            memcache.delete("events");
            Rests.storeFromRequest(req, resp, kind, new PrepareEntityCallback() {
                @Override
                public Entity prepare(JSONObject json, Entity entity) throws JSONException {
                    entity.setProperty("from", json.getString("from"));
                    entity.setProperty("enabled", json.getBoolean("enabled"));
                    return entity;
                }
            });
        }
    }
}

package voxxr.web;

import com.google.appengine.api.datastore.*;
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
public class EventsResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {

        String kind = "Event";
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
            Rests.sendAsJsonArray(
                    datastore.prepare(new Query(kind)
                                .addFilter("enabled", Query.FilterOperator.EQUAL, true)
                                .addSort("from"))
                            .asIterable(FetchOptions.Builder.withLimit(100)), resp);
        } else if ("POST".equalsIgnoreCase(req.getMethod())) {
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

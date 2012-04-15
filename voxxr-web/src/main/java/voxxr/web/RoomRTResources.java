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
public class RoomRTResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        if (!"POST".equalsIgnoreCase(req.getMethod())) {
            return;
        }
        if (!Rests.isSecure(req)) {
            resp.sendError(403, "Unauthorized");
            return;
        }
        try {
            String kind = "Room";
            String id = params.get("roomId");
            String rt = Rests.jsonObjectFromRequest(req).getString("roomRT");
            DatastoreService ds = DatastoreServiceFactory.getDatastoreService();
            Entity entity = ds.get(Rests.createKey(kind, id));
            entity.setProperty("rt", rt);
            JSONObject json = new JSONObject(((Text) entity.getProperty("json")).getValue());
            json.put("lastmodified", System.currentTimeMillis());
            json.put("rt", rt);
            entity.setProperty("json", new Text(json.toString()));
            ds.put(entity);
            Rests.clearEntityCache(entity.getKey());

            Rests.sendJson("{\"status\":\"ok\"}", req, resp);
        } catch (JSONException e) {
            resp.sendError(400, "Invalid json: " + e.getMessage());
        } catch (EntityNotFoundException e) {
            resp.sendError(404);
        }
    }
}



package voxxr.web;

import com.google.appengine.api.datastore.Entity;
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
public class PresentationResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        String kind = "Presentation";
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            Rests.sendAsJsonObject(Rests.createKey(kind, params.get("presentationId")), resp);
        } else if ("POST".equalsIgnoreCase(req.getMethod())) {
            Rests.storeFromRequest(req, resp, kind, new PrepareEntityCallback() {
                @Override
                public Entity prepare(JSONObject json, Entity entity) throws JSONException {
                    return entity;
                }
            });
        }
    }
}



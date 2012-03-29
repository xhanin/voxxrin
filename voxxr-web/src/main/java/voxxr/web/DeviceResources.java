package voxxr.web;

import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.Text;
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
public class DeviceResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        String kind = "Device";
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            Rests.sendAsJsonObject(Rests.createKey(kind, params.get("deviceId")), req, resp);
        } else if ("POST".equalsIgnoreCase(req.getMethod())) {
            Entity entity = Rests.insecureStoreFromRequest(req, resp, kind, new PrepareEntityCallback() {
                @Override
                public Entity prepare(JSONObject json, Entity entity) throws JSONException {
                    return entity;
                }
            });
            if (entity != null) {
                System.out.println("registered device " + ((Text) entity.getProperty("json")).getValue());
                Rests.sendAsJsonObject(entity, req, resp);
            }
        }
    }
}



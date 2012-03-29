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
public class PresentationResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        String kind = "Presentation";
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            try {
                String presentationId = params.get("presentationId");
                Entity pres = Rests.findEntityByKey(Rests.createKey(kind, presentationId));
                JSONObject json = new JSONObject(((Text) pres.getProperty("json")).getValue());
                json.put("favorites", countFavorites(presentationId));
                Rests.sendJson(json, req, resp);
            } catch (EntityNotFoundException e) {
                throw new RuntimeException(e);
            } catch (JSONException e) {
                throw new RuntimeException(e);
            }
        } else if ("POST".equalsIgnoreCase(req.getMethod())) {
            Rests.storeFromRequest(req, resp, kind, new PrepareEntityCallback() {
                @Override
                public Entity prepare(JSONObject json, Entity entity) throws JSONException {
                    return entity;
                }
            });
        }
    }

    public static int countFavorites(String presentationId) {
        return DatastoreServiceFactory.getDatastoreService().prepare(
                            new Query("MyPresentation")
                                    .addFilter("presId", Query.FilterOperator.EQUAL, presentationId)
                                    .addFilter("favorite", Query.FilterOperator.EQUAL, true))
                            .countEntities(FetchOptions.Builder.withDefaults());
    }
}



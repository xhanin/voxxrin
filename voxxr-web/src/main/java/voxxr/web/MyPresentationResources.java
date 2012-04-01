package voxxr.web;

import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.EntityNotFoundException;
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
public class MyPresentationResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        String kind = "MyPresentation";
        final User me = User.authenticate(req.getHeader("Authorization"));
        final String eventId = params.get("eventId");
        final String presId = params.get("presentationId");
        String id = me.getId() + "/" + eventId + "/" + presId;
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            Entity entity;
            try {
                entity = Rests.findEntityByKey(Rests.createKey(kind, id));
            } catch (EntityNotFoundException e) {
                entity = Rests.getOrCreateEntityForUpdate(kind, id);
                entity.setPropertiesFrom(MyPresentation.TO_ENTITY.apply(new MyPresentation(eventId, presId, me)));
                DatastoreServiceFactory.getDatastoreService().put(entity);
            }
            Rests.sendJson(MyPresentation.TO_JSON.apply(MyPresentation.FROM_ENTITY.apply(entity)), req, resp);
        } else if ("POST".equalsIgnoreCase(req.getMethod())) {
            try {
                JSONObject json = Rests.jsonObjectFromRequest(req);
                Entity entity = Rests.getOrCreateEntityForUpdate(kind, id);
                MyPresentation.mergeEntityFromJson(json, entity);
                DatastoreServiceFactory.getDatastoreService().put(entity);
                MyPresentation myPresentation = MyPresentation.FROM_ENTITY.apply(entity);

                MyResources.updateMyPresentation(myPresentation);
                Rests.sendJson(MyPresentation.TO_JSON.apply(myPresentation), req, resp);
            } catch (JSONException e) {
                throw new RuntimeException(e);
            }
        }
    }
}

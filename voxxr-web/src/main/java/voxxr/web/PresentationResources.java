package voxxr.web;

import com.google.appengine.api.datastore.*;
import com.google.common.base.Function;
import com.google.common.collect.Collections2;
import org.json.JSONException;
import org.json.JSONObject;

import javax.annotation.Nullable;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collection;
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
            Rests.sendAsJsonObject(Rests.createKey(kind, params.get("presentationId")), req, resp);
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

    public static Collection<MyPresentation> involvedUsers(final String presentationId) {
        return Collections2.transform(DatastoreServiceFactory.getDatastoreService().prepare(
                new Query("MyPresentation")
                        .addFilter("presId", Query.FilterOperator.EQUAL, presentationId)
                        .addFilter("twitterid", Query.FilterOperator.GREATER_THAN, 0)) // want only favorited by with a twitter id associated ATM
                .asList(FetchOptions.Builder.withDefaults()),
                new Function<Entity, MyPresentation>() {
                    @Override
                    public MyPresentation apply(@Nullable Entity input) {
                        return new MyPresentation(presentationId,
                            new User(
                                (String) input.getProperty("me"),
                                (Long) input.getProperty("twitterid"),
                                (String) input.getProperty("device")))
                                .setFavorite((Boolean) input.getProperty("favorite"));
                    }
                });
    }
}



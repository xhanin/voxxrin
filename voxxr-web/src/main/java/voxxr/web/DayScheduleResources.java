package voxxr.web;

import com.google.appengine.api.datastore.Entity;
import org.json.JSONArray;
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
public class DayScheduleResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        String kind = "DaySchedule";
        final String eventId = params.get("eventId");
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            String dayId = params.get("dayId");
            Rests.sendAsJsonObject(Rests.createKey(kind, dayId), req, resp);
        } else if ("POST".equalsIgnoreCase(req.getMethod())) {
            Rests.storeFromRequest(req, resp, kind, new PrepareEntityCallback() {
                @Override
                public Entity prepare(JSONObject json, final Entity dayEntity) throws JSONException {
                    // also store all schedule as presentation header entities
                    JSONArray schedule = json.getJSONArray("schedule");
                    for (int i = 0; i < schedule.length(); i++) {
                        JSONObject presHeader = (JSONObject) schedule.get(i);
                        Rests.storeFromJSON(presHeader, "PresentationHeader", new PrepareEntityCallback() {
                            @Override
                            public Entity prepare(JSONObject json, Entity entity) throws JSONException {
                                entity.setProperty("eventId", eventId);
                                entity.setProperty("dayId", dayEntity.getKey().getId());
                                entity.setProperty("nowplaying", false);
                                return entity;
                            }
                        });
                    }
                    return dayEntity;
                }
            });
        }
    }
}



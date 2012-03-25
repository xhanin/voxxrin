package voxxr.web;

import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.EntityNotFoundException;
import com.google.appengine.api.datastore.Text;
import com.google.appengine.api.memcache.Expiration;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;
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
            try {
                MemcacheService memcacheService = MemcacheServiceFactory.getMemcacheService("jsons");
                String cacheKey = kind + "/" + dayId;
                String dayJsonStr = (String) memcacheService.get(cacheKey);
                if (dayJsonStr != null) {
                    Rests.sendJson(dayJsonStr, resp);
                    return;
                }
                Entity day = Rests.findEntityByKey(Rests.createKey(kind, dayId));
                JSONObject json = new JSONObject(((Text) day.getProperty("json")).getValue());
                JSONArray schedule = (JSONArray) json.get("schedule");
                for (int i = 0; i < schedule.length(); i++) {
                     JSONObject pres = (JSONObject) schedule.get(i);
                    pres.put("favorites", PresentationResources.countFavorites((String) pres.get("id")));
                }
                dayJsonStr = json.toString();
                memcacheService.put(cacheKey, dayJsonStr, Expiration.byDeltaSeconds(15));
                Rests.sendJson(dayJsonStr, resp);
            } catch (EntityNotFoundException e) {
                throw new RuntimeException(e);
            } catch (JSONException e) {
                throw new RuntimeException(e);
            }
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



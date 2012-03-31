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
public class DayScheduleStatsResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        final String eventId = params.get("eventId");
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            String dayId = params.get("dayId");
            try {
                MemcacheService memcacheService = MemcacheServiceFactory.getMemcacheService("jsons");
                String cacheKey = "DayScheduleStats/" + dayId;
                String dayStatsJsonStr = (String) memcacheService.get(cacheKey);
                if (dayStatsJsonStr != null) {
                    Rests.sendJson(dayStatsJsonStr, req, resp);
                    return;
                }

                Entity day = Rests.findEntityByKey(Rests.createKey("DaySchedule", dayId));
                JSONObject dayJson = new JSONObject(((Text) day.getProperty("json")).getValue());
                JSONObject dayStatsJson = new JSONObject();
                dayStatsJson.put("id", dayJson.get("id"));
                JSONObject presentationsJson = new JSONObject();
                dayStatsJson.put("presStats", presentationsJson);
                JSONArray schedule = (JSONArray) dayJson.get("schedule");
                for (int i = 0; i < schedule.length(); i++) {
                    JSONObject pres = (JSONObject) schedule.get(i);
                    JSONObject presStat = new JSONObject();
                    presStat.put("id", pres.get("id"));
                    String presId = (String) pres.get("id");
                    presStat.put("favorites", PresentationResources.countFavorites(presId));
                    presentationsJson.put(presId, presStat);
                }
                dayStatsJsonStr = dayStatsJson.toString();
                memcacheService.put(cacheKey, dayStatsJsonStr, Expiration.byDeltaSeconds(15));
                Rests.sendJson(dayStatsJsonStr, req, resp);
            } catch (EntityNotFoundException e) {
                throw new RuntimeException(e);
            } catch (JSONException e) {
                throw new RuntimeException(e);
            }
        }
    }
}



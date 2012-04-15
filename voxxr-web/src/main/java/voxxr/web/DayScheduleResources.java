package voxxr.web;

import com.google.appengine.api.datastore.Entity;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Map;
import java.util.TimeZone;

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
                    final SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.S");
                    // timezone is set to paris at the time being, we would need to store that in the event to be clean
                    final TimeZone timeZone = TimeZone.getTimeZone("Europe/Paris");
                    JSONArray schedule = json.getJSONArray("schedule");
                    for (int i = 0; i < schedule.length(); i++) {
                        JSONObject presHeader = (JSONObject) schedule.get(i);
                        Rests.storeFromJSON(presHeader, "PresentationHeader", new PrepareEntityCallback() {
                            @Override
                            public Entity prepare(JSONObject json, Entity entity) throws JSONException {
                                entity.setProperty("id", json.getString("id"));
                                entity.setProperty("eventId", eventId);
                                entity.setProperty("dayId", dayEntity.getKey().getId());
                                try {
                                    // the method to convert to local time is not accurate, it may have problems when crossing DST
                                    // but there is no way to be sure of the time hen we store times in local time without timezone
                                    // info (when crossing DST, there is twice the local time 2:30 am)
                                    Date fromTime = format.parse(json.getString("fromTime"));
                                    fromTime = new Date(fromTime.getTime() - timeZone.getOffset(fromTime.getTime()));
                                    entity.setProperty("fromTime", fromTime);
                                    Date toTime = format.parse(json.getString("toTime"));
                                    toTime = new Date(toTime.getTime() - timeZone.getOffset(toTime.getTime()));
                                    entity.setProperty("toTime", toTime);
                                } catch (ParseException e) {
                                    throw new RuntimeException("unable to parse one of the date provided in presentation header: " + json.toString(), e);
                                }
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



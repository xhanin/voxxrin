package voxxr.web;

import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.EntityNotFoundException;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.Text;
import com.google.appengine.repackaged.com.google.common.collect.Collections2;
import com.google.appengine.repackaged.com.google.common.base.Function;
import com.google.appengine.repackaged.com.google.common.base.Throwables;
import com.google.appengine.repackaged.com.google.common.collect.ImmutableSet;
import com.google.gson.Gson;

import javax.annotation.Nullable;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.*;

/**
 * User: xavierhanin
 * Date: 1/28/12
 * Time: 8:51 PM
 */
public class EventResources implements RestRouter.RequestHandler {

    public void blah(){}
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        String kind = "Event";
        final String eventId = params.get("eventId");
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            Rests.sendAsJsonObject(Rests.createKey(kind, eventId), req, resp);
        } else if("DELETE".equalsIgnoreCase(req.getMethod())) {
            try {
                Entity event = Rests.findEntityByKey(Rests.createKey(kind, eventId));

                Map eventMap = new Gson().fromJson(((Text)event.getProperty("json")).getValue(), Map.class);

                Collection<Map> days = (Collection<Map>)eventMap.get("days");
                days = Collections2.transform(days, new Function<Map, Map>(){
                    @Override
                    public Map apply(@Nullable Map input) {
                        Entity dayEntity = null;
                        try {
                            dayEntity = Rests.findEntityByKey(Rests.createKey("DaySchedule", (String) input.get("id")));
                        } catch (EntityNotFoundException e) {
                            Throwables.propagate(e);
                        }
                        Map day = new Gson().fromJson(((Text)dayEntity.getProperty("json")).getValue(), Map.class);
                        return day;
                    }
                });

                Set<String> dayKeys = ImmutableSet.copyOf(Collections2.transform(days, new Function<Map, String>() {
                    @Override
                    public String apply(@Nullable Map map) {
                        return (String) map.get("id");
                    }
                }));

                Collection<Collection<Map>> daySchedules = Collections2.transform(days, new Function<Map, Collection<Map>>() {
                    @Override
                    public Collection<Map> apply(@Nullable Map map) {
                        return (Collection<Map>)map.get("schedule");
                    }
                });
                Collection<Map> schedules = new ArrayList<Map>();
                for(Collection<Map> daySchedule : daySchedules){
                    schedules.addAll(daySchedule);
                }

                Collection<Collection<String>> speakerCollectionKeys = Collections2.transform(schedules, new Function<Map, Collection<String>>() {
                    @Override
                    public Collection<String> apply(@Nullable Map scheduleMap) {
                        return Collections2.transform(((Collection<Map>)scheduleMap.get("speakers")), new Function<Map, String>() {
                            @Override
                            public String apply(@Nullable Map speakerMap) {
                                return (String)speakerMap.get("id");
                            }
                        });
                    }
                });
                // Flating speaker keys
                Collection<String> speakerKeys = new ArrayList<String>();
                for(Collection<String> speakerKeysColl : speakerCollectionKeys){
                    speakerKeys.addAll(speakerKeysColl);
                }
                speakerKeys = ImmutableSet.copyOf(speakerKeys); // Removing duplicates

                Collection<String> roomKeys = Collections2.transform(schedules, new Function<Map, String>() {
                    @Override
                    public String apply(@Nullable Map map) {
                        return (String)((Map)map.get("room")).get("id");
                    }
                });
                roomKeys = ImmutableSet.copyOf(roomKeys);

                Collection<String> prezKeys = Collections2.transform(schedules, new Function<Map, String>() {
                    @Override
                    public String apply(@Nullable Map map) {
                        return (String)map.get("id");
                    }
                });
                prezKeys = ImmutableSet.copyOf(prezKeys);

                Rests.deleteEntitiesByKeys(req, resp, "Speaker", speakerKeys.toArray(new String[0]));
                Rests.deleteEntitiesByKeys(req, resp, "Room", roomKeys.toArray(new String[0]));
                Rests.deleteEntitiesByKeys(req, resp, "Presentation", prezKeys.toArray(new String[0]));
                Rests.deleteEntitiesByKeys(req, resp, "PresentationHeader", prezKeys.toArray(new String[0]));
                Rests.deleteEntitiesByKeys(req, resp, "DaySchedule", dayKeys.toArray(new String[0]));
                Rests.deleteEntitiesByKeys(req, resp, "Event", eventId);

            } catch (EntityNotFoundException e) {
                resp.sendError(404);
            }
        }
    }
}

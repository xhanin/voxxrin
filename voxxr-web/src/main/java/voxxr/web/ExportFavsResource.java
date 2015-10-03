package voxxr.web;

import com.google.appengine.api.datastore.*;
import com.google.gson.Gson;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.util.*;

/**
 * @author fcamblor
 */
public class ExportFavsResource implements RestRouter.RequestHandler {

    Gson gson = new Gson();

    private static class UserFavorite {
        private String twitterId;
        List<EventFavorite> eventFavs;

        public UserFavorite(String twitterId) {
            this.twitterId = twitterId;
        }

        public String getTwitterId() {
            return twitterId;
        }

        public List<EventFavorite> getEventFavs() {
            return eventFavs;
        }

        public void setEventFavs(List<EventFavorite> eventFavs) {
            this.eventFavs = eventFavs;
        }
    }
    private static class EventFavorite {
        String eventId;
        Set<String> favs;

        public EventFavorite(String eventId) {
            this.eventId = eventId;
        }

        public String getEventId() {
            return eventId;
        }

        public Set<String> getFavs() {
            return favs;
        }

        public void setFavs(Set<String> favs) {
            this.favs = favs;
        }
    }

    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        if(!Rests.isSecure(req)){
            resp.sendError(403, "Unauthorized");
            return;
        }

        String kind = "My";
        Iterable<Entity> mys = Rests.fetchAll(kind);

        List<UserFavorite> userFavorites = new ArrayList<UserFavorite>();
        for(Entity my : mys){
            Map<String, Map<String, Map<String,Map<String,Map<String, Object>>>>> myMap = gson.fromJson(((Text)my.getProperty("json")).getValue(), Map.class);
            if(myMap.containsKey("twitterid")){
                MyResources.mergeTwitterInfos(myMap, gson);

                UserFavorite userFav = new UserFavorite(my.getKey().getName());

                userFav.setEventFavs(new ArrayList<EventFavorite>());
                for(Map.Entry<String,Map<String,Map<String,Map<String, Object>>>> event : myMap.get("events").entrySet()){
                    EventFavorite eventFav = new EventFavorite(event.getKey());

                    eventFav.setFavs(new HashSet<String>());
                    for(Map.Entry<String,Map<String,Object>> presentation : event.getValue().get("presentations").entrySet()){
                        if(Boolean.TRUE.equals(presentation.getValue().get("favorite"))) {
                            eventFav.getFavs().add(presentation.getKey());
                        }
                    }

                    userFav.getEventFavs().add(eventFav);
                }

                userFavorites.add(userFav);
            }
        }

        // Sending user favorites
        resp.addHeader("Content-Type", "application/json; charset=utf-8");
        resp.addHeader("Access-Control-Allow-Origin", "*");

        OutputStreamWriter writer = new OutputStreamWriter(resp.getOutputStream(), "UTF8");
        gson.toJson(userFavorites, writer);
        writer.flush();
        writer.close();
    }
}

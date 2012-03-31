package voxxr.web;

import com.google.appengine.api.datastore.Entity;
import com.google.common.base.Function;
import org.json.JSONException;
import org.json.JSONObject;

import javax.annotation.Nullable;

/**
 * User: xavierhanin
 * Date: 3/31/12
 * Time: 2:55 PM
 */
public class MyPresentation {
    public static Function<Entity, MyPresentation> FROM_ENTITY = new Function<Entity, MyPresentation>() {
        @Override
        public MyPresentation apply(@Nullable Entity input) {
            return new MyPresentation(
                (String) input.getProperty("eventId"),
                (String) input.getProperty("presId"),
                new User(
                    (String) input.getProperty("userid"),
                    (Long) input.getProperty("twitterid"),
                    (String) input.getProperty("deviceid")))
                    .setFavorite((Boolean) input.getProperty("favorite"));
        }
    };
    public static Function<MyPresentation, Entity> TO_ENTITY = new Function<MyPresentation, Entity>() {
        @Override
        public Entity apply(@Nullable MyPresentation input) {
            Entity entity = new Entity("MyPresentation");
            entity.setProperty("eventId", input.getEventId());
            entity.setProperty("presId", input.getPresentationId());
            User user = input.getUser();
            entity.setProperty("userid", user.getId());
            entity.setProperty("deviceid", user.getDeviceid());
            entity.setProperty("twitterid", user.getTwitterid());
            entity.setProperty("favorite", input.isFavorite());
            return entity;
        }
    };
    public static Function<MyPresentation, JSONObject> TO_JSON = new Function<MyPresentation, JSONObject>() {
        @Override
        public JSONObject apply(@Nullable MyPresentation input) {
            if (input == null) {
                return null;
            }
            JSONObject jsonObject = new JSONObject();
            try {
                jsonObject.put("eventId", input.getEventId());
                jsonObject.put("presId", input.getPresentationId());
                jsonObject.put("userid", input.getUser().getId());
                jsonObject.put("twitterid", input.getUser().getTwitterid());
                jsonObject.put("deviceid", input.getUser().getDeviceid());
                jsonObject.put("favorite", input.isFavorite());
            } catch (JSONException e) {
                throw new RuntimeException(e);
            }
            return jsonObject;
        }
    };

    private final String eventId;
    private final String presentationId;
    private final User user;
    private boolean favorite;

    public MyPresentation(String eventId, String presentationId, User user) {
        this.eventId = eventId;
        this.presentationId = presentationId;
        this.user = user;
    }

    public String getPresentationId() {
        return presentationId;
    }

    public String getEventId() {
        return eventId;
    }

    public User getUser() {
        return user;
    }

    public boolean isFavorite() {
        return favorite;
    }

    public MyPresentation setFavorite(boolean favorite) {
        this.favorite = favorite;
        return this;
    }
}

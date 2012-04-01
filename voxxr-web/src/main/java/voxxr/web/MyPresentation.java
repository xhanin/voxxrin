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
                    .setFavorite((Boolean) input.getProperty("favorite"))
                    .setPresence((String) input.getProperty("presence"));
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
            entity.setProperty("presence", input.getPresence());
            return entity;
        }
    };
    public static Function<JSONObject, MyPresentation> FROM_JSON = new Function<JSONObject, MyPresentation>() {
        @Override
        public MyPresentation apply(@Nullable JSONObject json) {
            try {
                MyPresentation myPres = new MyPresentation(
                    json.getString("eventId"),
                    json.getString("presId"),
                    new User(
                        json.getString("userid"),
                        json.getLong("twitterid"),
                        json.getString("deviceid")));
                if (json.has("favorite")) {
                    myPres.setFavorite(json.getBoolean("favorite"));
                }
                if (json.has("presence")) {
                    myPres.setPresence(json.getString("presence"));
                }
                return myPres;
            } catch (JSONException e) {
                throw new RuntimeException(e);
            }
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
                jsonObject.put("presence", input.getPresence());
            } catch (JSONException e) {
                throw new RuntimeException(e);
            }
            return jsonObject;
        }
    };
    public static Entity mergeEntityFromJson(JSONObject json, Entity entity) {
        try {
            if (entity.getProperty("eventId") == null) {
                entity.setProperty("eventId", json.getString("eventId"));
                entity.setProperty("presId", json.getString("presId"));
            }
            if (entity.getProperty("userId") == null) {
                entity.setProperty("userid", json.getString("userid"));
            }
            entity.setProperty("deviceid", json.getString("deviceid"));
            entity.setProperty("twitterid", json.getLong("twitterid"));
                
            if (json.has("favorite")) {
                entity.setProperty("favorite", json.getBoolean("favorite"));
            }
            if (json.has("presence")) {
                entity.setProperty("presence", json.getString("presence"));
            }
        } catch (JSONException e) {
            throw new RuntimeException(e);
        }
        return entity;
    }

    private final String eventId;
    private final String presentationId;
    private final User user;
    private boolean favorite;
    private String presence;

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

    public MyPresentation setPresence(String presence) {
        this.presence = presence;
        return this;
    }

    public String getPresence() {
        return this.presence;
    }
}

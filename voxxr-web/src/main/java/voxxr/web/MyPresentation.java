package voxxr.web;

import com.google.appengine.api.datastore.Entity;
import com.google.common.base.Function;
import org.json.JSONException;
import org.json.JSONObject;

import javax.annotation.Nullable;
import java.util.Arrays;

/**
 * User: xavierhanin
 * Date: 3/31/12
 * Time: 2:55 PM
 */
public class MyPresentation {
    private static int toInt(Object o) {
        return o instanceof Number ? ((Number) o).intValue() : 0;
    }
    public static Function<Entity, MyPresentation> FROM_ENTITY = new Function<Entity, MyPresentation>() {
        @Override
        public MyPresentation apply(@Nullable Entity input) {
            Long modified = (Long) input.getProperty("lastmodified");
            return new MyPresentation(
                (String) input.getProperty("eventId"),
                (String) input.getProperty("presId"),
                new User(
                    (String) input.getProperty("userid"),
                    (Long) input.getProperty("twitterid"),
                    (String) input.getProperty("deviceid")))
                    .setFavorite((Boolean) input.getProperty("favorite"))
                    .setPresence((String) input.getProperty("presence"))
                    .setApplauseCount(toInt(input.getProperty("applauseCount")))
                    .setYawnCount(toInt(input.getProperty("yawnCount")))
                    .setWonderCount(toInt(input.getProperty("wonderCount")))
                    .setRateCount(toInt(input.getProperty("rateCount")))
                    .setRateAvg(toInt(input.getProperty("rateAvg")))
                    .setLastModified(modified == null ? 0 : modified)
                    ;
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
            entity.setProperty("lastmodified", input.getLastModified());
            entity.setProperty("favorite", input.isFavorite());
            entity.setProperty("presence", input.getPresence());
            entity.setProperty("applauseCount", input.getApplauseCount());
            entity.setProperty("yawnCount", input.getYawnCount());
            entity.setProperty("wonderCount", input.getWonderCount());
            entity.setProperty("rateCount", input.getRateCount());
            entity.setProperty("rateAvg", input.getRateAvg());
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
                        json.has("twitterid") ? json.getLong("twitterid") : 0,
                        json.getString("deviceid")));
                if (json.has("lastmodified")) {
                    myPres.setLastModified(json.getLong("lastmodified"));
                }
                if (json.has("favorite")) {
                    myPres.setFavorite(json.getBoolean("favorite"));
                }
                if (json.has("presence")) {
                    myPres.setPresence(json.getString("presence"));
                }
                if (json.has("applauseCount")) {
                    myPres.setApplauseCount(json.getInt("applauseCount"));
                }
                if (json.has("yawnCount")) {
                    myPres.setYawnCount(json.getInt("yawnCount"));
                }
                if (json.has("wonderCount")) {
                    myPres.setWonderCount(json.getInt("wonderCount"));
                }
                if (json.has("rateCount")) {
                    myPres.setRateCount(json.getInt("rateCount"));
                }
                if (json.has("rateAvg")) {
                    myPres.setRateAvg(json.getInt("rateAvg"));
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
                jsonObject.put("id", input.getUser().getId() + "/" + input.getEventId() + "/" + input.getPresentationId());
                jsonObject.put("lastmodified", input.getLastModified());
                jsonObject.put("eventId", input.getEventId());
                jsonObject.put("presId", input.getPresentationId());
                jsonObject.put("userid", input.getUser().getId());
                jsonObject.put("twitterid", input.getUser().getTwitterid());
                jsonObject.put("deviceid", input.getUser().getDeviceid());
                jsonObject.put("favorite", input.isFavorite());
                jsonObject.put("presence", input.getPresence());
                jsonObject.put("applauseCount", input.getApplauseCount());
                jsonObject.put("yawnCount", input.getYawnCount());
                jsonObject.put("wonderCount", input.getWonderCount());
                jsonObject.put("rateCount", input.getRateCount());
                jsonObject.put("rateAvg", input.getRateAvg());
            } catch (JSONException e) {
                throw new RuntimeException(e);
            }
            return jsonObject;
        }
    };
    public static Entity mergeEntityFromJson(JSONObject json, Entity entity) {
        try {
            Entity original = entity.clone();
            if (entity.getProperty("eventId") == null) {
                entity.setProperty("eventId", json.getString("eventId"));
                entity.setProperty("presId", json.getString("presId"));
            }
            if (entity.getProperty("userId") == null) {
                entity.setProperty("userid", json.getString("userid"));
            }
            entity.setProperty("deviceid", json.getString("deviceid"));
            if (json.has("twitterid")) {
                entity.setProperty("twitterid", json.getLong("twitterid"));
            }
                
            if (json.has("favorite")) {
                entity.setProperty("favorite", json.getBoolean("favorite"));
            }
            if (json.has("presence")) {
                entity.setProperty("presence", json.getString("presence"));
            }
            for (String p : Arrays.asList("applauseCount", "yawnCount", "wonderCount", "rateCount", "rateAvg")) {
                if (json.has(p)) {
                    entity.setProperty(p, json.getInt(p));
                }
            }
            if (!original.getProperties().equals(entity.getProperties())) {
                entity.setProperty("lastmodified", System.currentTimeMillis());
            }
        } catch (JSONException e) {
            throw new RuntimeException(e);
        }
        return entity;
    }

    private final String eventId;
    private final String presentationId;
    private final User user;
    private long lastmodified;
    private boolean favorite;
    private String presence;
    private int applauseCount;
    private int yawnCount;
    private int wonderCount;

    private int rateCount;
    private int rateAvg;

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

    public MyPresentation setApplauseCount(int applauseCount) {
        this.applauseCount = applauseCount;
        return this;
    }

    public int getApplauseCount() {
        return this.applauseCount;
    }

    public MyPresentation setYawnCount(int yawnCount) {
        this.yawnCount = yawnCount;
        return this;
    }

    public int getYawnCount() {
        return this.yawnCount;
    }

    public MyPresentation setWonderCount(int wonderCount) {
        this.wonderCount = wonderCount;
        return this;
    }

    public int getWonderCount() {
        return this.wonderCount;
    }

    public MyPresentation setRateCount(int rateCount) {
        this.rateCount = rateCount;
        return this;
    }

    public int getRateCount() {
        return this.rateCount;
    }

    public MyPresentation setRateAvg(int rateAvg) {
        this.rateAvg = rateAvg;
        return this;
    }

    public int getRateAvg() {
        return this.rateAvg;
    }

    public MyPresentation setLastModified(long lastmodified) {
        this.lastmodified = lastmodified;
        return this;
    }

    public long getLastModified() {
        return this.lastmodified;
    }
}

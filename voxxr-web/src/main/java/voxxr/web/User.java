package voxxr.web;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * User: xavierhanin
 * Date: 3/30/12
 * Time: 10:51 PM
 */
public class User {
    private static final Pattern AUTH_PATTERN = Pattern.compile("([^@\\(]+)(?:\\((.+)\\))?@(.+)");

    public static User authenticate(String authorization) {
        Matcher m = AUTH_PATTERN.matcher(authorization);
        if (m.matches()) {
            return new User(m.group(1),
                    m.group(2) == null ? null : Long.valueOf(m.group(2)),
                    m.group(3)
            );
        } else {
            throw new RuntimeException("invalid authorization: " + authorization);
        }
    }

    private boolean anonymous;
    private final String id; // this is the user id, usually a twitter screen name
    private final Long twitterid;
    private final String deviceid;

    public User(String id, Long twitterid, String deviceid) {
        this.anonymous = "a".equals(id);
        this.id = anonymous ? deviceid : id;
        this.deviceid = deviceid;
        this.twitterid = twitterid;
    }

    public String getId() {
        return id;
    }

    public String getDeviceid() {
        return deviceid;
    }

    public Long getTwitterid() {
        return twitterid;
    }

    public boolean isAnonymous() {
        return anonymous;
    }

    @Override
    public String toString() {
        return "User{" +
                "id='" + id + '\'' +
                ", twitterid=" + twitterid +
                ", deviceid='" + deviceid + '\'' +
                '}';
    }
}

package voxxr.web;

import twitter4j.auth.AccessToken;

/**
 * @author fcamblor
 */
public class TwitterUser extends User {
    private AccessToken accessToken;

    public TwitterUser(String id, Long twitterid, String deviceid, AccessToken accessToken) {
        super(id, twitterid, deviceid);
        this.accessToken = accessToken;
    }

    public AccessToken getAccessToken() {
        return accessToken;
    }
}

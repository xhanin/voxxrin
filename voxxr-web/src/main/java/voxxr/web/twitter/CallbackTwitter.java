package voxxr.web.twitter;

import com.google.appengine.api.datastore.*;
import twitter4j.Twitter;
import twitter4j.TwitterException;
import twitter4j.auth.AccessToken;
import twitter4j.auth.RequestToken;
import voxxr.web.RestRouter;
import voxxr.web.User;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.util.List;
import java.util.Map;

/**
 * User: sebastiendescamps
 * Date: 29/03/12
 * Time: 22:10 PM
 */
public class CallbackTwitter implements RestRouter.RequestHandler {

	@Override
	public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
		Twitter twitter = TwitterHelper.getTwitter();
        DatastoreService ds = DatastoreServiceFactory.getDatastoreService();
        if (req.getParameter("denied") != null) {
            resp.sendRedirect("/notsignedin.html");
            return;
        }
        try {
            Entity requestTokenEntity = ds.get(KeyFactory.stringToKey(params.get("requestTokenKeyString")));
            RequestToken requestToken = new RequestToken((String) requestTokenEntity.getProperty("token"), (String) requestTokenEntity.getProperty("tokenSecret"));

            String verifier = req.getParameter("oauth_verifier");
            try {
                AccessToken oAuthAccessToken = twitter.getOAuthAccessToken(requestToken, verifier);
                long twitterid = oAuthAccessToken.getUserId();
                String screenName = oAuthAccessToken.getScreenName();

                String deviceid = (String) requestTokenEntity.getProperty("deviceid");
                Entity oAuthAccessTokenEntity = new Entity("OAuthAccessToken");
                oAuthAccessTokenEntity.setProperty("service", "twitter.com");
                oAuthAccessTokenEntity.setProperty("twitterid", twitterid);
                oAuthAccessTokenEntity.setProperty("screen_name", screenName);
                oAuthAccessTokenEntity.setProperty("token", oAuthAccessToken.getToken());
                oAuthAccessTokenEntity.setProperty("tokenSecret", oAuthAccessToken.getTokenSecret());
                oAuthAccessTokenEntity.setProperty("datetime", System.currentTimeMillis());
                oAuthAccessTokenEntity.setProperty("deviceid", deviceid);
                oAuthAccessTokenEntity.setProperty("status", "CREATED");
                ds.put(oAuthAccessTokenEntity);

                resp.sendRedirect("/signedin.html");
            } catch (TwitterException e) {
                resp.sendRedirect("/notsignedin.html");
            }
        } catch (EntityNotFoundException e) {
            respondError(req, resp);
        }
	}

    private void respondError(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        OutputStreamWriter writer = new OutputStreamWriter(resp.getOutputStream(), "UTF8");
        writer.append("<html><head></head><body>Error, please try again...</body></html>");
        writer.flush();
        writer.close();
    }

    public static User authenticatedFromTwitter(String deviceid) {
        DatastoreService ds = DatastoreServiceFactory.getDatastoreService();

        Query q = new Query("OAuthAccessToken")
                .addFilter("deviceid", Query.FilterOperator.EQUAL, deviceid)
                .addFilter("status", Query.FilterOperator.EQUAL, "CREATED")
                .addSort("datetime", Query.SortDirection.DESCENDING);

        List<Entity> entities = ds.prepare(q).asList(FetchOptions.Builder.withLimit(1));
        if (entities.isEmpty()) {
            return null;
        }

        Entity e = entities.get(0);
        e.setProperty("status", "AUTHENTICATED");
        ds.put(e);

        return new User((String) e.getProperty("screen_name"), (Long) e.getProperty("twitterid"), deviceid);
    }


}

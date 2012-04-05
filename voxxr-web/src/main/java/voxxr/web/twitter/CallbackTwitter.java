package voxxr.web.twitter;

import com.google.appengine.api.datastore.*;
import twitter4j.Twitter;
import twitter4j.TwitterException;
import twitter4j.auth.AccessToken;
import twitter4j.auth.RequestToken;
import voxxr.web.RestRouter;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.net.URI;
import java.net.URISyntaxException;
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
        try {
            Entity requestTokenEntity = ds.get(KeyFactory.stringToKey(params.get("requestTokenKeyString")));
            RequestToken requestToken = new RequestToken((String) requestTokenEntity.getProperty("token"), (String) requestTokenEntity.getProperty("tokenSecret"));

            String verifier = req.getParameter("oauth_verifier");
            try {
                AccessToken oAuthAccessToken = twitter.getOAuthAccessToken(requestToken, verifier);
                long twitterid = oAuthAccessToken.getUserId();
                String screenName = oAuthAccessToken.getScreenName();

                Entity oAuthAccessTokenEntity = new Entity("OAuthAccessToken");
                oAuthAccessTokenEntity.setProperty("service", "twitter.com");
                oAuthAccessTokenEntity.setProperty("twitterid", twitterid);
                oAuthAccessTokenEntity.setProperty("screen_name", screenName);
                oAuthAccessTokenEntity.setProperty("token", oAuthAccessToken.getToken());
                oAuthAccessTokenEntity.setProperty("tokenSecret", oAuthAccessToken.getTokenSecret());
                oAuthAccessTokenEntity.setProperty("datetime", System.currentTimeMillis());
                ds.put(oAuthAccessTokenEntity);

                String backTo = (String) requestTokenEntity.getProperty("backTo");
                URI url = new URI(backTo);
                String query = "";
                if (url.getQuery() != null) {
                    query = "?" + url.getQuery() + "&twitterid=" + twitterid;
                } else {
                    query = "?twitterid=" + twitterid;
                }
                String port = "";
                if (url.getPort() != -1) {
                    port = ":" + url.getPort() + "";
                }
                String output = url.getScheme() + "://" + url.getHost() + port + url.getPath() + query
                        + (url.getRawFragment() == null ? "" : "#" + url.getRawFragment());

//                resp.setStatus(302);
//                resp.addHeader("Location", output);
//                resp.getOutputStream().println();
//                resp.getOutputStream().close();
                
                String r = "<script>window.location.replace('" + output + "');</script>";
                OutputStreamWriter writer = new OutputStreamWriter(resp.getOutputStream(), "UTF8");
                writer.append("<!doctype html>\n<html><head>" + r + "</head></html>");
                writer.flush();
                writer.close();

//                resp.sendRedirect(output);
            } catch (TwitterException e) {
                resp.sendRedirect((String) requestTokenEntity.getProperty("backTo"));
            } catch (URISyntaxException e) {
                resp.sendRedirect((String) requestTokenEntity.getProperty("backTo"));
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

}

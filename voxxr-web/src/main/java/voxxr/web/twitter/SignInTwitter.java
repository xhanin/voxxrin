package voxxr.web.twitter;

import com.google.appengine.api.datastore.*;
import twitter4j.Twitter;
import twitter4j.TwitterException;
import twitter4j.auth.RequestToken;
import voxxr.web.RestRouter;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

/**
 * User: sebastiendescamps
 * Date: 29/03/12
 * Time: 22:10 PM
 */
public class SignInTwitter implements RestRouter.RequestHandler {

	@Override
	public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
		Twitter twitter = TwitterHelper.getTwitter();
		try {
            String backTo = req.getParameter("back_to");
            Entity token = new Entity("RequestToken");
            token.setProperty("backTo", backTo);
            DatastoreService ds = DatastoreServiceFactory.getDatastoreService();
            Key key = ds.put(token);
            RequestToken requestToken = twitter.getOAuthRequestToken(buildCallBackURL(req, key));
            token.setProperty("token", requestToken.getToken());
            token.setProperty("tokenSecret", requestToken.getTokenSecret());
            ds.put(token);
			resp.sendRedirect(requestToken.getAuthenticationURL());
		} catch (TwitterException e) {
			resp.sendError(HttpServletResponse.SC_UNAUTHORIZED);
		}

	}

	private String buildCallBackURL(HttpServletRequest request, Key key) {
		StringBuffer callbackURL = request.getRequestURL();
		int index = callbackURL.lastIndexOf("/");
		callbackURL.replace(index, callbackURL.length(), "").append("/authentified/" + KeyFactory.keyToString(key));
		return callbackURL.toString();
	}

}

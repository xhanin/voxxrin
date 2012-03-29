package voxxr.web.twitter;

import java.io.IOException;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import twitter4j.Twitter;
import twitter4j.TwitterException;
import twitter4j.TwitterFactory;
import twitter4j.auth.RequestToken;
import twitter4j.conf.ConfigurationBuilder;
import voxxr.web.RestRouter;

/**
 * User: sebastiendescamps
 * Date: 29/03/12
 * Time: 22:10 PM
 */
public class SignInTwitter implements RestRouter.RequestHandler {

	@Override
	public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
		ConfigurationBuilder cb = new ConfigurationBuilder();
		cb.setDebugEnabled(true).setOAuthConsumerKey("NZQ97JHZ7Ho6XRUTppuQ").setOAuthConsumerSecret("Fl12lMSNRh7gAufW9jX32uQy2GFkPaTQOeaQUDrk78");

		Twitter twitter = new TwitterFactory(cb.build()).getInstance();
		req.getSession().setAttribute("twitter", twitter);
		try {

			RequestToken requestToken = twitter.getOAuthRequestToken(buildCallBackURL(req));

			req.getSession().setAttribute("requestToken", requestToken);
			resp.sendRedirect(requestToken.getAuthenticationURL());

		} catch (TwitterException e) {
			resp.sendError(HttpServletResponse.SC_UNAUTHORIZED);
		}

	}

	private String buildCallBackURL(HttpServletRequest request) {
		StringBuffer callbackURL = request.getRequestURL();
		int index = callbackURL.lastIndexOf("/");
		callbackURL.replace(index, callbackURL.length(), "").append("/callback");
		return callbackURL.toString();
	}

}

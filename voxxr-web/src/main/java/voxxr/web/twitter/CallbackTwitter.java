package voxxr.web.twitter;

import java.io.IOException;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import twitter4j.IDs;
import twitter4j.ResponseList;
import twitter4j.Twitter;
import twitter4j.TwitterException;
import twitter4j.User;
import twitter4j.auth.RequestToken;
import voxxr.web.RestRouter;

/**
 * User: sebastiendescamps
 * Date: 29/03/12
 * Time: 22:10 PM
 */
public class CallbackTwitter implements RestRouter.RequestHandler {

	@Override
	public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
		Twitter twitter = (Twitter) req.getSession().getAttribute("twitter");
		RequestToken requestToken = (RequestToken) req.getSession().getAttribute("requestToken");
		String verifier = req.getParameter("oauth_verifier");
		try {
			// on vérifie que l'authentification est OK
			twitter.getOAuthAccessToken(requestToken, verifier);
			req.getSession().removeAttribute("requestToken");

			// on récupère les followers
			IDs ids = twitter.getFollowersIDs(-1);
			ResponseList<User> responseList = twitter.lookupUsers(ids.getIDs());
			req.getSession().setAttribute("followers", responseList);

			// TODO : reste plus qu'à stocker les followers

			resp.sendRedirect(req.getContextPath() + "/");
		} catch (TwitterException e) {
			resp.sendError(HttpServletResponse.SC_UNAUTHORIZED);
		}

	}

}

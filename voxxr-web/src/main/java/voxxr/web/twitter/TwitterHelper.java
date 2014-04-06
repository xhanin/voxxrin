package voxxr.web.twitter;

import twitter4j.Twitter;
import twitter4j.TwitterFactory;
import twitter4j.auth.AccessToken;
import twitter4j.conf.Configuration;
import twitter4j.conf.ConfigurationBuilder;
import voxxr.web.AuthorizationTokens;

import java.util.logging.Logger;

/**
 * User: xavierhanin
 * Date: 4/3/12
 * Time: 10:39 PM
 */
public class TwitterHelper {
    private static TwitterFactory twitterFactory;

    static {
        ConfigurationBuilder cb = new ConfigurationBuilder();
        cb.setDebugEnabled(true)
                .setOAuthConsumerSecret(AuthorizationTokens.TWITTER_CONSUMER_SECRET)
                .setOAuthConsumerKey(AuthorizationTokens.TWITTER_CONSUMER_KEY);
        Configuration conf = cb.build();
        twitterFactory = new TwitterFactory(conf);
        Logger.getLogger("TWITTER").info("Loaded Twitter Factory with following settings:\n" + conf);
    }

    public static Twitter getTwitter() {
        return twitterFactory.getInstance();
    }

    public static Twitter fromAccessTokens(AccessToken accessToken) {
        return  twitterFactory.getInstance(accessToken);
    }
}

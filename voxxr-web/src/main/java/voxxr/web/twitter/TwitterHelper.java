package voxxr.web.twitter;

import twitter4j.Twitter;
import twitter4j.TwitterFactory;
import twitter4j.conf.Configuration;
import twitter4j.conf.ConfigurationBuilder;

import java.util.logging.Logger;

/**
 * User: xavierhanin
 * Date: 4/3/12
 * Time: 10:39 PM
 */
public class TwitterHelper {
    private static TwitterFactory twitterFactory;

    public static final String CONSUMER_KEY = "4mmKNvN3CFUNygmQRvRsZA";

    public static final String CONSUMER_SECRET = "d4In9G8zze32nWKyXxzIXgdAisGN84rECsXpE7h9TA";

    static {
        ConfigurationBuilder cb = new ConfigurationBuilder();
        cb.setDebugEnabled(true)
                .setOAuthRequestTokenURL("https://api.twitter.com/oauth/request_token")
                .setOAuthAuthorizationURL("https://api.twitter.com/oauth/authorize")
                .setOAuthAccessTokenURL("https://api.twitter.com/oauth/access_token")
                .setOAuthAuthenticationURL("https://api.twitter.com/oauth/authenticate")
                .setRestBaseURL("http://api.twitter.com/1/")
                .setOAuthConsumerKey(CONSUMER_KEY)
                .setOAuthConsumerSecret(CONSUMER_SECRET);
        Configuration conf = cb.build();
        twitterFactory = new TwitterFactory(conf);
        Logger.getLogger("TWITTER").info("Loaded Twitter Factory with following settings:\n" + conf);
    }

    public static Twitter getTwitter() {
        return twitterFactory.getInstance();
    }
}

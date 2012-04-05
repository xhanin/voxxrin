package voxxr.web.twitter;

import twitter4j.Twitter;
import twitter4j.TwitterFactory;
import twitter4j.conf.ConfigurationBuilder;

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
                .setOAuthConsumerKey("4mmKNvN3CFUNygmQRvRsZA")
                .setOAuthConsumerSecret("d4In9G8zze32nWKyXxzIXgdAisGN84rECsXpE7h9TA");
        twitterFactory = new TwitterFactory(cb.build());
    }

    public static Twitter getTwitter() {
        return twitterFactory.getInstance();
    }
}

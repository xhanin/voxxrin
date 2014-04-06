package voxxr.web.twitter;

import com.google.appengine.repackaged.com.google.common.base.Function;
import com.google.appengine.repackaged.com.google.common.base.Throwables;
import com.google.appengine.repackaged.com.google.common.collect.Collections2;
import com.google.appengine.repackaged.com.google.common.collect.Lists;
import com.google.gson.Gson;
import twitter4j.ResponseList;
import twitter4j.Twitter;
import twitter4j.TwitterException;
import voxxr.web.RestRouter;
import voxxr.web.Rests;
import voxxr.web.TwitterUser;
import voxxr.web.User;

import javax.annotation.Nullable;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.*;

/**
 * @author fcamblor
 */
public class TwitterUserInfos implements RestRouter.RequestHandler{

    private static class TwitterUserIdToUser implements Function<Long, twitter4j.User> {
        Map<Long, twitter4j.User> usersByIds;

        private TwitterUserIdToUser(Map<Long, twitter4j.User> usersByIds) {
            this.usersByIds = usersByIds;
        }

        @Nullable
        @Override
        public twitter4j.User apply(@Nullable Long id) {
            return usersByIds.get(id);
        }
    }

    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        User me = User.authenticate(req.getHeader("Authorization"));
        if(me == null) {
            throw new IllegalStateException("Missing authenticated voxxrin user");
        }

        TwitterUser twitterUser = CallbackTwitter.authenticatedTwitterUser(me.getDeviceid());
        if(twitterUser == null) {
            throw new IllegalStateException("Missing authenticated twitter user");
        }

        String twitterUserIdStr = req.getParameter("user_id");
        if(twitterUser == null) {
            throw new IllegalArgumentException("Missing user_id parameter");
        }
        long twitterUserId = Long.valueOf(twitterUserIdStr);

        Map<String, Object> result = new HashMap<String, Object>();
        Twitter twitter = TwitterHelper.fromAccessTokens(twitterUser.getAccessToken());
        try {
            Set<Long> twitterIdsToFetch = new HashSet<Long>();
            twitterIdsToFetch.add(twitterUserId);

            Set<Long> followerIds = new HashSet<Long>();
            for(long followerId : twitter.getFollowersIDs(twitterUserId, -1).getIDs()){
                followerIds.add(followerId);
            }
            twitterIdsToFetch.addAll(followerIds);

            Set<Long> friendIds = new HashSet<Long>();
            for(long friendId : twitter.getFriendsIDs(twitterUserId, -1).getIDs()){
                friendIds.add(friendId);
            }
            twitterIdsToFetch.addAll(friendIds);

            // Need to partition user infos fetched because the service doesn't allow
            // more than 100 users
            final Map<Long, twitter4j.User> usersByIds = new HashMap<Long, twitter4j.User>();
            List<List<Long>> partitions = Lists.partition(new ArrayList(twitterIdsToFetch), 100);
            for(List<Long> twitterIdsToFetchPartition : partitions){
                long[] primTwitterIds = new long[twitterIdsToFetchPartition.size()];
                int i=0;
                for (Iterator<Long> iter = twitterIdsToFetchPartition.iterator(); iter.hasNext(); i++) {
                    primTwitterIds[i] = iter.next().longValue();
                }

                ResponseList<twitter4j.User> users = twitter.lookupUsers(primTwitterIds);
                for(twitter4j.User user : users){
                    usersByIds.put(user.getId(), user);
                }
            }

            result.put("twitterUser", usersByIds.get(twitterUserId));
            result.put("followers", Collections2.transform(followerIds, new TwitterUserIdToUser(usersByIds)));
            result.put("friends", Collections2.transform(friendIds, new TwitterUserIdToUser(usersByIds)));

            Rests.sendJson(new Gson().toJson(result), req, resp);
        } catch (TwitterException e) {
            Throwables.propagate(e);
        }
    }
}

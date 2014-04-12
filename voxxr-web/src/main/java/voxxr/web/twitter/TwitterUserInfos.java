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

    // Legacy mode will return followers & friends *plain* objects instead of only ids
    // This is intended to allow old mobile app version to still interact well with the server
    // Once the new voxxrin mobile app will be fully deployed, we might drop this mode
    private boolean legacyMode;

    public TwitterUserInfos(boolean legacyMode) {
        this.legacyMode = legacyMode;
    }

    private static enum FetchMode {
        RelatedWithIds {
            @Override
            public void prepareUserLookups(Twitter twitter, long twitterUserId, Set<Long> userIdsToLookup, Map<String, Object> result) {
                fetchAndProvideFollowersIds(twitter, twitterUserId, result);
                fetchAndProvideFriendsIds(twitter, twitterUserId, result);
            }
        }, RelatedFull {
            @Override
            public void prepareUserLookups(Twitter twitter, long twitterUserId, Set<Long> userIdsToLookup, Map<String, Object> result) {
                Set<Long> followersIds = fetchAndProvideFollowersIds(twitter, twitterUserId, result);
                Set<Long> friendsIds = fetchAndProvideFriendsIds(twitter, twitterUserId, result);

                userIdsToLookup.addAll(followersIds);
                userIdsToLookup.addAll(friendsIds);
            }

            @Override
            public void afterUsersLookedUp(Map<String, Object> result, final Map<Long, twitter4j.User> usersByIds) {
                Set<Long> followersIds = (Set<Long>) result.get("followersIds");
                Set<Long> friendsIds = (Set<Long>) result.get("friendsIds");

                TwitterUserIdToUser fromUserIdToUser = new TwitterUserIdToUser(usersByIds);

                result.put("followers", Collections2.transform(followersIds, fromUserIdToUser));
                result.put("friends", Collections2.transform(friendsIds, fromUserIdToUser));
            }
        }, None {
            @Override
            public void prepareUserLookups(Twitter twitter, long twitterUserId, Set<Long> userIdsToLookup, Map<String, Object> result) {
                // Don't do anything
            }
        };

        public static FetchMode from(String val) {
            if(val == null || None.name().equalsIgnoreCase(val)) {
                return None;
            } else if(RelatedFull.name().equalsIgnoreCase(val)) {
                return RelatedFull;
            } else {
                return RelatedWithIds;
            }
        }

        public abstract void prepareUserLookups(Twitter twitter, long twitterUserId, Set<Long> userIdsToLookup, Map<String, Object> result);

        private static Set<Long> fetchAndProvideFollowersIds(Twitter twitter, long twitterUserId, Map<String, Object> result) {
            Set<Long> followerIds = new HashSet<Long>();

            try {
                for(long followerId : twitter.getFollowersIDs(twitterUserId, -1).getIDs()){
                    followerIds.add(followerId);
                }
            } catch (TwitterException e) {
                Throwables.propagate(e);
            }

            result.put("followersIds", followerIds);
            return followerIds;
        }

        private static Set<Long> fetchAndProvideFriendsIds(Twitter twitter, long twitterUserId, Map<String, Object> result) {
            Set<Long> friendIds = new HashSet<Long>();

            try {
                for(long friendId : twitter.getFriendsIDs(twitterUserId, -1).getIDs()){
                    friendIds.add(friendId);
                }
            } catch (TwitterException e) {
                Throwables.propagate(e);
            }

            result.put("friendsIds", friendIds);
            return friendIds;
        }

        public void afterUsersLookedUp(Map<String, Object> result, Map<Long, twitter4j.User> usersByIds) {
            // By default, don't do anything
        }
    }

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

        FetchMode mode = legacyMode?FetchMode.None:FetchMode.from(req.getParameter("fetchMode"));

        Twitter twitter = TwitterHelper.fromAccessTokens(twitterUser.getAccessToken());
        try {
            Map<String, Object> result = prepareResults(twitter, twitterUserId, mode);;

            Rests.sendJson(new Gson().toJson(result), req, resp);
        } catch (TwitterException e) {
            Throwables.propagate(e);
        }
    }

    protected Map<String, Object> prepareResults(Twitter twitter, long twitterUserId, FetchMode mode) throws TwitterException {
        Map<String, Object> result = new HashMap<String, Object>();

        Set<Long> userIdsToLookup = new HashSet<Long>();
        userIdsToLookup.add(twitterUserId);

        mode.prepareUserLookups(twitter, twitterUserId, userIdsToLookup, result);

        // Need to partition user infos fetched because the service doesn't allow
        // more than 100 users
        final Map<Long, twitter4j.User> usersByIds = new HashMap<Long, twitter4j.User>();
        List<List<Long>> partitions = Lists.partition(new ArrayList(userIdsToLookup), 100);
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

        mode.afterUsersLookedUp(result, usersByIds);

        result.put("twitterUser", usersByIds.get(twitterUserId));
        return result;
    }
}

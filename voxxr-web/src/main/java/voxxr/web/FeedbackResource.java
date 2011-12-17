package voxxr.web;

import org.atmosphere.cpr.Broadcaster;

import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;

/**
 * User: xavierhanin
 * Date: 12/17/11
 * Time: 10:00 AM
 */
@Path("/feedback")
public class FeedbackResource {
    public static class Feedback {
        final String room;
        final String user;
        final String value;

        private Feedback(String room, String user, String value) {
            this.user = user;
            this.room = room;
            this.value = value;
        }

        @Override
        public String toString() {
            return room + '|' + user + '|' + value;
        }

        public static Feedback parse(String s) {
            String[] parts = s.split("\\|");
            return new Feedback(parts[0], parts[1], parts[2]);
        }
    }


    @POST
    @Produces("application/json")
    public String sendFeedback(String feedback) {
        Feedback f = Feedback.parse(feedback);

        Broadcaster broadcaster = RoomResource.roomBroadcaster(f.room);
        if (broadcaster != null) {
            System.out.println("broadcasting " + feedback);
            broadcaster.broadcast(feedback);
        }

        return "{\"status\":\"ok\"}";
    }
}

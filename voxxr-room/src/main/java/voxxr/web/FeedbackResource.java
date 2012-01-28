package voxxr.web;

import org.atmosphere.cpr.Broadcaster;

import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.core.Response;

/**
 * User: xavierhanin
 * Date: 12/17/11
 * Time: 10:00 AM
 */
@Path("/feedback")
public class FeedbackResource {
    public static class Feedback {
        final String user;
        final String value;

        private Feedback(String user, String value) {
            this.user = user;
            this.value = value;
        }

        @Override
        public String toString() {
            return user + '|' + value;
        }

        public static Feedback parse(String s) {
            String[] parts = s.split("\\|");
            return new Feedback(parts[0], parts[1]);
        }
    }


    private String room = "r1";

    @POST
    public Response sendFeedback(String feedback) {
        Feedback f = Feedback.parse(feedback);

        if (f.value.startsWith("R")) {
            try {
                RoomResource.rate(Integer.parseInt(f.value.substring(1)));
            } catch (NumberFormatException e) {
                return Response
                        .ok("{\"status\":\"nok\", \"message\":\"Invalid rate\"}", "application/json")
                        .header("Access-Control-Allow-Origin", "*")
                        .build();
            }
        }

        Broadcaster broadcaster = RoomResource.roomBroadcaster(room);
        if (broadcaster != null) {
            System.out.println("broadcasting " + feedback);
            broadcaster.broadcast(feedback);
        }


        return Response
                .ok("{\"status\":\"ok\"}", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .build();
    }
}

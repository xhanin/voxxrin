package voxxr.web;

import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;

/**
 * User: xavierhanin
 * Date: 12/17/11
 * Time: 10:00 AM
 */
@Path("/feedback")
public class Feedback {
    @POST
    @Produces("application/json")
    public String sendFeedback(String feedback) {
        System.out.println(feedback);
        return "{\"status\":\"ok\"}";
    }
}

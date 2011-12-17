package voxxr.web;

import org.atmosphere.cpr.Broadcaster;
import org.atmosphere.cpr.BroadcasterFactory;
import org.atmosphere.jersey.SuspendResponse;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;

/**
 * Simple PubSub resource that demonstrate many functionality supported by
 * Atmosphere JQuery Plugin and Atmosphere Jersey extension.
 *
 * @author Jeanfrancois Arcand
 */
@Path("/room/{room}")
@Produces("text/html;charset=ISO-8859-1")
public class RoomResource {
    public static Broadcaster roomBroadcaster(String room) {
        return roomBroadcaster(room, false);
    }
    public static Broadcaster roomBroadcaster(String room, boolean createIfNull) {
        return BroadcasterFactory.getDefault().lookup("room#" + room, createIfNull);
    }

    @GET
    public SuspendResponse<String> subscribe(@PathParam("room") String room) {
        return new SuspendResponse.SuspendResponseBuilder<String>()
                .broadcaster(roomBroadcaster(room, true))
                .addListener(new EventsLogger())
                .build();
    }

}
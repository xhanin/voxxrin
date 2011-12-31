package voxxr.web;

import org.atmosphere.cpr.Broadcaster;
import org.atmosphere.cpr.BroadcasterFactory;
import org.atmosphere.jersey.SuspendResponse;

import javax.ws.rs.*;
import javax.ws.rs.core.Response;

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

    @OPTIONS
    public Response preFlightSubscribe(@PathParam("room") String room) {
        return Response.ok()
                .header("Access-Control-Allow-Origin", "*")
                .header("Access-Control-Allow-Methods", "GET")
                .header("Access-Control-Allow-Headers", "Origin, X-Atmosphere-Framework, X-Cache-Date, X-Atmosphere-tracking-id, X-Atmosphere-Transport")
                .build();
    }

    @GET
    public SuspendResponse<String> subscribe(@PathParam("room") String room) {
        return new SuspendResponse.SuspendResponseBuilder<String>()
                .header("Access-Control-Allow-Origin", "*")
                .broadcaster(roomBroadcaster(room, true))
                .addListener(new EventsLogger())
                .build();
    }

}
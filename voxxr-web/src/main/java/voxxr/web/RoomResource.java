package voxxr.web;

import org.atmosphere.cpr.Broadcaster;
import org.atmosphere.cpr.BroadcasterFactory;
import org.atmosphere.jersey.SuspendResponse;

import javax.ws.rs.GET;
import javax.ws.rs.OPTIONS;
import javax.ws.rs.Path;
import javax.ws.rs.core.Response;

/**
 */
@Path("/room")
public class RoomResource {
    public static Broadcaster roomBroadcaster(String room) {
        return roomBroadcaster(room, false);
    }
    public static Broadcaster roomBroadcaster(String room, boolean createIfNull) {
        return BroadcasterFactory.getDefault().lookup("room#" + room, createIfNull);
    }

    private String room = "r1";
    private String roomTitle = "Ze Highly interactive talk";

    @GET
    public Response getRoomDetails() {
        Broadcaster broadcaster = roomBroadcaster(room);
        int connections = 1;
        if (broadcaster != null) {
            connections = broadcaster.getAtmosphereResources().size();
            // !!! on the client if data is less than 8 bytes it doesn't trigger the callback
            broadcaster.broadcast("-----|C" + connections);
        }
        return Response.ok("{\"status\":\"ok\"" +
                ",\"title\":\"" + roomTitle + "\"" +
                ",\"connections\":\"" + connections + "\"}",
                "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .build();
    }

    @OPTIONS
    @Path("/rt")
    public Response preFlightSubscribe() {
        return Response.ok()
                .header("Access-Control-Allow-Origin", "*")
                .header("Access-Control-Allow-Methods", "GET, POST")
                .header("Access-Control-Allow-Headers", "Origin, Content-Type, X-Atmosphere-Framework, X-Cache-Date, X-Atmosphere-tracking-id, X-Atmosphere-Transport")
                .build();
    }

    @GET
    @Path("/rt")
    public SuspendResponse<String> subscribe() {
        Broadcaster broadcaster = roomBroadcaster(room, true);
        return new SuspendResponse.SuspendResponseBuilder<String>()
                .header("Access-Control-Allow-Origin", "*")
                .broadcaster(broadcaster)
                .addListener(new EventsLogger())
                .build();
    }

}
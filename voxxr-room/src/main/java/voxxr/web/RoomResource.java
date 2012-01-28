package voxxr.web;

import org.atmosphere.cpr.Broadcaster;
import org.atmosphere.cpr.BroadcasterFactory;
import org.atmosphere.jersey.SuspendResponse;

import javax.ws.rs.GET;
import javax.ws.rs.OPTIONS;
import javax.ws.rs.Path;
import javax.ws.rs.core.Response;
import java.math.BigDecimal;
import java.math.RoundingMode;

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

    // DIRTY AND NON THREAD SAFETY WAY TO STORE SOME DATA, WILL LATER PUT THAT IN A STORE
    private static BigDecimal rate = BigDecimal.ZERO;
    private static long ratings;

    public static void rate(int r) {
        BigDecimal t = rate.multiply(BigDecimal.valueOf(ratings));
        ratings++;
        rate = t.add(BigDecimal.valueOf(r)).divide(BigDecimal.valueOf(ratings), 8, RoundingMode.HALF_UP);
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
                ",\"connections\":\"" + connections + "\"" +
                ",\"rate\":" + rate +
                ",\"ratings\":" + ratings +
                "}",
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
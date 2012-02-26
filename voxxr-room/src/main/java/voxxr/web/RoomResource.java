package voxxr.web;

import org.atmosphere.cpr.Broadcaster;
import org.atmosphere.cpr.BroadcasterFactory;
import org.atmosphere.jersey.SuspendResponse;
import voxxr.data.*;

import javax.ws.rs.GET;
import javax.ws.rs.OPTIONS;
import javax.ws.rs.Path;
import javax.ws.rs.core.Response;

/**
 */
@Path("/room")
public class RoomResource {
    public static Broadcaster roomBroadcaster(Room room) {
        return roomBroadcaster(room, false);
    }
    public static Broadcaster roomBroadcaster(Room room, boolean createIfNull) {
        return BroadcasterFactory.getDefault().lookup("room#" + room.getId(), createIfNull);
    }

    private final VoxxrRepository repo = CassandraVoxxrRepository.getInstance();

    @GET
    public Response getRoomDetails() {
        Room room = Room.getCurrent();
        Broadcaster broadcaster = roomBroadcaster(room);
        int connections = 1;
        if (broadcaster != null) {
            connections = broadcaster.getAtmosphereResources().size();
            // !!! on the client if data is less than 8 bytes it doesn't trigger the callback
            broadcaster.broadcast("-----|C" + connections);
        }
        Presentation currentPres = room.getCurrentPres();
        MeanRating roomMeanRating = repo.getPresMeanRating(currentPres.getId());

        return Response.ok("{\"status\":\"ok\"" +
                ",\"title\":\"" + currentPres.getTitle() + "\"" +
                ",\"connections\":\"" + connections + "\"" +
                ",\"rate\":" + roomMeanRating.getRate() +
                ",\"ratings\":" + roomMeanRating.getRatingsCount() +
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
        Broadcaster broadcaster = roomBroadcaster(Room.getCurrent(), true);
        return new SuspendResponse.SuspendResponseBuilder<String>()
                .header("Access-Control-Allow-Origin", "*")
                .broadcaster(broadcaster)
                .addListener(new EventsLogger())
                .build();
    }

}
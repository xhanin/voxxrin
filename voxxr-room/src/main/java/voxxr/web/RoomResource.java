package voxxr.web;

import com.google.common.base.Strings;
import com.google.common.collect.Lists;
import org.atmosphere.cpr.Broadcaster;
import org.atmosphere.cpr.BroadcasterFactory;
import org.atmosphere.jersey.SuspendResponse;
import org.slf4j.LoggerFactory;
import voxxr.app.VoxxrinApp;
import voxxr.data.*;

import javax.ws.rs.*;
import javax.ws.rs.core.Response;
import java.util.concurrent.TimeUnit;

/**
 */
@Path("/room")
public class RoomResource {
    public static enum BroadcastMode {
        ALL("all"), DASHBOARD("dashboard"), USER("user"), USER_DELAYED("user", 15000);

        private String broadcasterName;
        private int delayInMs = 0;

        private BroadcastMode(String broadcasterName) {
            this.broadcasterName = broadcasterName;
        }

        private BroadcastMode(String broadcasterName, int delayInMs) {
            this.broadcasterName = broadcasterName;
            this.delayInMs = delayInMs;
        }

        public String getBroadcasterName() {
            return broadcasterName;
        }

        public int getDelayInMs() {
            return delayInMs;
        }
    }

    private static Broadcaster roomBroadcaster(Room room, BroadcastMode mode) {
        return roomBroadcaster(room, mode, false);
    }
    public static Broadcaster roomBroadcaster(Room room, BroadcastMode mode, boolean createIfNull) {
        return BroadcasterFactory.getDefault().lookup("room#" + room.getId() + "/"
                + (mode == null ? BroadcastMode.USER : mode).getBroadcasterName(), createIfNull);
    }

    public static void broadcast(Room room, String data, BroadcastMode... mode) {
        for (BroadcastMode broadcastMode : Lists.asList(BroadcastMode.ALL, mode)) {
            Broadcaster bc = roomBroadcaster(room, broadcastMode);
            if (bc != null) {
                // under 8 bytes atmosphere client doesn't notify the event
                if (broadcastMode.getDelayInMs() > 0) {
                    bc.delayBroadcast(Strings.padStart(data, 8, '-'),
                            broadcastMode.getDelayInMs(), TimeUnit.MILLISECONDS);
                } else {
                    bc.broadcast(Strings.padStart(data, 8, '-'));
                }
            }
        }
    }

    public static int connections(Room room) {
        int con = 0;
        for (BroadcastMode mode : BroadcastMode.values()) {
            Broadcaster bc = roomBroadcaster(room, mode);
            if (bc != null) {
                con += bc.getAtmosphereResources().size();
            }
        }
        return Math.max(1, con);
    }

    private final VoxxrRepository repo = CassandraVoxxrRepository.getInstance();

    @GET
    public Response getRoomDetails() {
        Room room = Room.getCurrent();
        int connections = connections(room);
        broadcast(room, "-|C" + connections, BroadcastMode.USER, BroadcastMode.DASHBOARD);
        Presentation currentPres = room.getCurrentPres();
        MeanRating roomMeanRating = currentPres == null ? null : repo.getPresMeanRating(currentPres.getId());

        return Response.ok("{\"status\":\"ok\"" +
                ",\"pres\":\"" + (currentPres == null ? "" : currentPres.getId()) + "\"" +
                ",\"title\":\"" + (currentPres == null ? "" : currentPres.getTitle()) + "\"" +
                ",\"connections\":\"" + connections + "\"" +
                ",\"rate\":" + (roomMeanRating == null ? "0" : roomMeanRating.getRate()) +
                ",\"ratings\":" + (roomMeanRating == null ? "0" : roomMeanRating.getRatingsCount()) +
                "}",
                "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .build();
    }

    @POST
    @Path("/presentation")
    public Response setCurrentPresentation(@QueryParam("eventId") String eventId, @QueryParam("id") String id) {
        Room room = Room.getCurrent();
        String title;
        if (id == null || id.toString().trim().length() == 0) {
            Presentation currentPres = room.getCurrentPres();
            if (currentPres != null && currentPres.getId() != null) {
                VoxxrinApp.stopPres(eventId, currentPres.getId());
            }
            room.setCurrentPres(null);
            title = null;
        } else {
            title = VoxxrinApp.startPres(eventId, id);
            room.setCurrentPres(new Presentation(id, title));
        }
        LoggerFactory.getLogger(RoomResource.class).info("current presentation changed to " + room.getCurrentPres());
        broadcast(room, "-|T" + Strings.nullToEmpty(title), BroadcastMode.USER, BroadcastMode.DASHBOARD);
        return Response.ok("{\"status\":\"ok\"}",
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
    public SuspendResponse<String> subscribe(@QueryParam("mode") BroadcastMode mode) {
        Broadcaster broadcaster = roomBroadcaster(Room.getCurrent(), mode, true);
        return new SuspendResponse.SuspendResponseBuilder<String>()
                .header("Access-Control-Allow-Origin", "*")
                .broadcaster(broadcaster)
                .build();
    }

}
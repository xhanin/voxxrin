package voxxr.web;

import org.atmosphere.cpr.Broadcaster;
import voxxr.data.CassandraVoxxrRepository;
import voxxr.data.EV;
import voxxr.data.Room;
import voxxr.data.VoxxrRepository;

import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.core.Response;

/**
 * User: xavierhanin
 * Date: 12/17/11
 * Time: 10:00 AM
 */
@Path("/feedback")
public class EVResource {

    private VoxxrRepository repo = CassandraVoxxrRepository.getInstance();

    @POST
    public Response sendFeedback(String evBC) {
        Room room = Room.getCurrent();
        EV ev;
        try {
            ev = EV.parse(room.getId(), evBC);
        } catch (IllegalArgumentException ex) {
            return Response
                    .ok("{\"status\":\"nok\", \"message\":\"Invalid EV\"}", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .build();
        }

        repo.store(ev);

        Broadcaster broadcaster = RoomResource.roomBroadcaster(room);
        if (broadcaster != null) {
            System.out.println("broadcasting " + ev);
            broadcaster.broadcast(ev.toBC());
        }


        return Response
                .ok("{\"status\":\"ok\"}", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .build();
    }
}

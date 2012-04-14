package voxxr.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import voxxr.data.*;

import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.core.Response;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * User: xavierhanin
 * Date: 12/17/11
 * Time: 10:00 AM
 */
@Path("/feedback")
public class EVResource {
    private final static Map<String, Long> lastTimestampsByUserAndType = new ConcurrentHashMap<String, Long>();
    public static final int EV_OF_SAME_TYPE_THRESHOLD_IN_MS = 1000;

    private VoxxrRepository repo = CassandraVoxxrRepository.getInstance();
    private final Logger logger = LoggerFactory.getLogger(EVResource.class);

    @POST
    public Response sendFeedback(String evBC) {
        Room room = Room.getCurrent();
        Presentation currentPres = room.getCurrentPres();
        if (currentPres == null) {
            return Response
                    .ok("{\"status\":\"nok\", \"message\":\"Invalid State, no current presentation\"}", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .build();
        }
        EV ev;
        try {
            ev = EV.parse(currentPres.getId(), evBC);
        } catch (IllegalArgumentException ex) {
            return Response
                    .ok("{\"status\":\"nok\", \"message\":\"Invalid EV\"}", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .build();
        }

        String key = ev.getUser() + "/" + ev.getType().getCode();
        Long lastEVFromUserOfSameType = lastTimestampsByUserAndType.get(key);
        if (lastEVFromUserOfSameType != null
                && (System.currentTimeMillis() - lastEVFromUserOfSameType.longValue()) < EV_OF_SAME_TYPE_THRESHOLD_IN_MS) {
            logger.info("ignored EV {} last one was at {}",
                    ev, new SimpleDateFormat("HH:mm:ss.S").format(new Date(lastEVFromUserOfSameType)));
            return Response
                .ok("{\"status\":\"ignored\"}", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .build();
        }
        lastTimestampsByUserAndType.put(key, System.currentTimeMillis());

        repo.store(ev);

        RoomResource.broadcast(room, ev.toBC(), ev.getBCModes());

        currentPres.updateHotFactor(ev);

        return Response
                .ok("{\"status\":\"ok\"}", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .build();
    }
}

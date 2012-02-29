package voxxr;

import org.atmosphere.cpr.Broadcaster;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.webapp.WebAppContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import voxxr.data.CassandraVoxxrRepository;
import voxxr.data.EV;
import voxxr.data.Presentation;
import voxxr.data.Room;
import voxxr.web.RoomResource;

import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * User: xavierhanin
 * Date: 12/10/11
 * Time: 2:55 PM
 */
public class Main {

    public static void main(String[] args) throws Exception {
        Logger logger = LoggerFactory.getLogger(Main.class);
        logger.info("Hello Voxxr!");

        logger.info("starting web server");
        Server server = new Server(8076);

        WebAppContext context = new WebAppContext();
        context.setDescriptor("web/WEB-INF/web.xml");
        context.setResourceBase("web");
        context.setContextPath("/");
        context.setParentLoaderPriority(true);

        server.setHandler(context);

        server.start();

        logger.info("storing Room Start EV");
        CassandraVoxxrRepository.getInstance().store(new EV("", "-", EV.Type.ROOM_START, Env.getRoom()));

        Executors.newSingleThreadScheduledExecutor().scheduleAtFixedRate(new Runnable() {
            public void run() {
                Presentation currentPres = Room.getCurrent().getCurrentPres();
                if (currentPres != null) {
                    double hotFactor = currentPres.getHotFactor();
                    if (hotFactor > 0) {
                        EV ev = new EV(currentPres.getId(), "-------", EV.Type.HOT_FACTOR, String.format("%3.2f", hotFactor));
                        CassandraVoxxrRepository.getInstance().store(ev);
                        Broadcaster broadcaster = RoomResource.roomBroadcaster(Room.getCurrent());
                        if (broadcaster != null) {
                            broadcaster.broadcast(ev.toBC());
                        }
                    }
                }
            }
        }, 0, 1, TimeUnit.SECONDS);

        server.join();
    }
}

package voxxr;

import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.webapp.WebAppContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import voxxr.data.CassandraVoxxrRepository;
import voxxr.data.EV;

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

        server.join();
    }
}

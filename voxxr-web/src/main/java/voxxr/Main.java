package voxxr;

import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.webapp.WebAppContext;

/**
 * User: xavierhanin
 * Date: 12/10/11
 * Time: 2:55 PM
 */
public class Main {
    public static void main(String[] args) throws Exception {
        System.out.println("Hello");

        Server server = new Server(8076);

        WebAppContext context = new WebAppContext();
        context.setDescriptor("web/WEB-INF/web.xml");
        context.setResourceBase("web");
        context.setContextPath("/");
        context.setParentLoaderPriority(true);

        server.setHandler(context);

        server.start();
        server.join();
    }
}

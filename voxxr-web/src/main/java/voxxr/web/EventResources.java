package voxxr.web;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

/**
 * User: xavierhanin
 * Date: 1/28/12
 * Time: 8:51 PM
 */
public class EventResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        String kind = "Event";
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            final String eventId = params.get("eventId");
            Rests.sendAsJsonObject(Rests.createKey(kind, eventId), resp);
        }
    }
}

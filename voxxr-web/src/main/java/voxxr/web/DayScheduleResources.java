package voxxr.web;

import com.google.common.io.Resources;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

/**
 * User: xavierhanin
 * Date: 1/28/12
 * Time: 8:51 PM
 */
public class DayScheduleResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        resp.addHeader("Content-Type", "application/json");
        resp.addHeader("Access-Control-Allow-Origin", "*");

        Resources.copy(
                Resources.getResource(EventsResources.class, "dayschedule-" + params.get("eventId") + "-" + params.get("dayId") + ".json"),
                resp.getOutputStream());
    }
}



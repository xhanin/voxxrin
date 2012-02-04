package voxxr.web;

import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Maps;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * User: xavierhanin
 * Date: 1/31/12
 * Time: 9:32 PM
 */
public class RestRouter extends HttpServlet {
    public static class Route {
        final RequestHandler handler;
        final Pattern pattern;
        final Map<Integer, String> paramNames;

        public Route(RequestHandler handler, Pattern pattern, Map<Integer, String> paramNames) {
            this.handler = handler;
            this.pattern = pattern;
            this.paramNames = paramNames;
        }
    }

    public static interface RequestHandler {
        void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException;
    }

    private final List<Route> routes = Arrays.asList(
        new Route(new EventsResources(), Pattern.compile("/r/events"), new ImmutableMap.Builder<Integer, String>().build()),
        new Route(new NowPlayingResources(), Pattern.compile("/r/events/(\\d+)/nowplaying"),
                new ImmutableMap.Builder<Integer, String>().put(1, "eventId").build()),
        new Route(new DayScheduleResources(), Pattern.compile("/r/events/(\\d+)/day/(\\d+)"),
                new ImmutableMap.Builder<Integer, String>().put(1, "eventId").put(2, "dayId").build())
    );

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String uri = req.getRequestURI();

        for (Route route : routes) {
            Matcher matcher = route.pattern.matcher(uri);
            if (matcher.matches()) {
                Map<String, String> params = Maps.newLinkedHashMap();
                for (Map.Entry<Integer, String> param : route.paramNames.entrySet()) {
                    params.put(param.getValue(), matcher.group(param.getKey()));
                }

                route.handler.handle(req, resp, params);
            }
        }
    }
}

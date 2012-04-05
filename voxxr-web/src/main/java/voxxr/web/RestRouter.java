package voxxr.web;

import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Maps;
import voxxr.web.twitter.CallbackTwitter;
import voxxr.web.twitter.SignInTwitter;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
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
        new Route(new EventResources(), Pattern.compile("/r/events/([a-z0-9\\-]+)"),
                new ImmutableMap.Builder<Integer, String>().put(1, "eventId").build()),
        new Route(new MyResources(), Pattern.compile("/r/my"), new ImmutableMap.Builder<Integer, String>().build()),
        new Route(new NowPlayingResources(), Pattern.compile("/r/events/([a-z0-9\\-]+)/nowplaying"),
                new ImmutableMap.Builder<Integer, String>().put(1, "eventId").build()),
        new Route(new DayScheduleResources(), Pattern.compile("/r/events/([a-z0-9\\-]+)/day/([a-z0-9\\-]+)"),
                new ImmutableMap.Builder<Integer, String>().put(1, "eventId").put(2, "dayId").build()),
        new Route(new DayScheduleStatsResources(), Pattern.compile("/r/events/([a-z0-9\\-]+)/day/([a-z0-9\\-]+)/stats"),
                new ImmutableMap.Builder<Integer, String>().put(1, "eventId").put(2, "dayId").build()),
        new Route(new PresentationResources(), Pattern.compile("/r/events/([a-z0-9\\-]+)/presentations/([a-z0-9\\-]+)"),
                new ImmutableMap.Builder<Integer, String>().put(1, "eventId").put(2, "presentationId").build()),
        new Route(new PresentationStatsResources(), Pattern.compile("/r/events/([a-z0-9\\-]+)/presentations/([a-z0-9\\-]+)/stats"),
                new ImmutableMap.Builder<Integer, String>().put(1, "eventId").put(2, "presentationId").build()),
        new Route(new SpeakerResources(), Pattern.compile("/r/events/([a-z0-9\\-]+)/speakers/([a-z0-9\\-]+)"),
                new ImmutableMap.Builder<Integer, String>().put(1, "eventId").put(2, "speakerId").build()),
        new Route(new SpeakerPictureResources(), Pattern.compile("/r/events/([a-z0-9\\-]+)/speakers/([a-z0-9\\-]+)/picture\\.([a-z]+)"),
                new ImmutableMap.Builder<Integer, String>().put(1, "eventId").put(2, "speakerId").put(3, "format").build()),
        new Route(new MyPresentationResources(), Pattern.compile("/r/events/([a-z0-9\\-]+)/presentations/([a-z0-9\\-]+)/my"),
                new ImmutableMap.Builder<Integer, String>().put(1, "eventId").put(2, "presentationId").build()),
        new Route(new DeviceResources(), Pattern.compile("/r/devices/([a-z0-9\\-]+)?"),
                new ImmutableMap.Builder<Integer, String>().put(1, "deviceId").build()),
        new Route(new SignInTwitter(), Pattern.compile("/r/twitter/signin"),
                new ImmutableMap.Builder<Integer, String>().build()),
        new Route(new CallbackTwitter(), Pattern.compile("/r/twitter/authentified/(.+)"),
                new ImmutableMap.Builder<Integer, String>().put(1, "requestTokenKeyString").build())
    );

    @Override
    protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String uri = req.getRequestURI();

        for (Route route : routes) {
            Matcher matcher = route.pattern.matcher(uri);
            if (matcher.matches()) {
                if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
                    resp.addHeader("Access-Control-Allow-Origin", "*");
                    resp.addHeader("Access-Control-Allow-Methods", "GET, POST");
                    resp.addHeader("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, Accept");
                    return;
                }

                Map<String, String> params = Maps.newLinkedHashMap();
                for (Map.Entry<Integer, String> param : route.paramNames.entrySet()) {
                    params.put(param.getValue(), matcher.group(param.getKey()));
                }

                try {
                    route.handler.handle(req, resp, params);
                } catch(Exception ex) {
                    Logger.getLogger("RestRouter").log(
                            Level.SEVERE,
                            "error in request handling with " + route.handler.getClass().getSimpleName(),
                            ex);
                }

                return;
            }
        }
        resp.sendError(404);
    }
}

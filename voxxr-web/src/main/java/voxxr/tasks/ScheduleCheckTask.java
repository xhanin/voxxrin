package voxxr.tasks;

import com.google.appengine.api.datastore.*;
import com.google.appengine.api.taskqueue.Queue;
import com.google.appengine.api.taskqueue.QueueFactory;
import com.google.appengine.api.taskqueue.TaskOptions;
import org.json.JSONException;
import org.json.JSONObject;
import voxxr.web.RestRouter;
import voxxr.web.Rests;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URL;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 * User: xavierhanin
 * Date: 4/15/12
 * Time: 10:39 AM
 */
public class ScheduleCheckTask implements RestRouter.RequestHandler {
    private final Logger logger = Logger.getLogger(ScheduleCheckTask.class.getName());

    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        DatastoreService ds = DatastoreServiceFactory.getDatastoreService();
        Date date = new Date();
        logger.info("checking scheduling on " + date);

        try {
            Iterable<Entity> presentationsToClose = ds.prepare(new Query("PresentationHeader")
                    .addFilter("toTime", Query.FilterOperator.LESS_THAN_OR_EQUAL, date)
                    .addFilter("nowplaying", Query.FilterOperator.EQUAL, true))
                    .asIterable(FetchOptions.Builder.withDefaults());

            for (Entity pres : presentationsToClose) {
                if ("dvx655".equals(pres.getProperty("id"))) {
                    // very specific case: Voxxrin prez stop is handled manually
                    continue;
                }
                 // to close a presentation in room we simply set the current pres id to ""
                updatePresInRoom(pres, getRoomRT(ds, pres), (String) pres.getProperty("eventId"), "");
            }

            Iterable<Entity> presentationsToOpen = ds.prepare(new Query("PresentationHeader")
                    .addFilter("fromTime", Query.FilterOperator.LESS_THAN_OR_EQUAL, date)
                    .addFilter("nowplaying", Query.FilterOperator.EQUAL, false))
                    .asIterable(FetchOptions.Builder.withDefaults());

            for (Entity pres : presentationsToOpen) {
                if (((Date) pres.getProperty("toTime")).compareTo(date) < 0) {
                    // we can't filter out these presentations in the query,
                    // BigTable supports only one inequality filter
                    continue;
                }
                updatePresInRoom(pres, getRoomRT(ds, pres), (String) pres.getProperty("eventId"), (String) pres.getProperty("id"));
            }
        } finally {
            maybeScheduleNextCheck(ds, date);
        }
    }

    private void updatePresInRoom(Object context, String rt, String eventId, String newPresIdInRoom) throws IOException {
        if (rt == null) {
            logger.warning("unable to find room RT address for: " + context + ". IGNORED.");
        } else {
            logger.info("updating pres in room " + rt + ": '" + newPresIdInRoom + "'; context is: " + context);
            Rests.post(new URL(rt + "/r/room/presentation?eventId=" + eventId + "&id=" + newPresIdInRoom), "");
        }
    }

    private String getRoomRT(DatastoreService ds, Entity pres) {
        String rt = null;
        String jsonStr = ((Text) pres.getProperty("json")).getValue();
        try {
            JSONObject json = new JSONObject(jsonStr);
            JSONObject room = json.getJSONObject("room");
            if (!room.has("rt")) {
                try {
                    Entity roomEntity = ds.get(Rests.createKey("Room", room.getString("id")));
                    rt = (String) roomEntity.getProperty("rt");
                } catch (EntityNotFoundException e) {
                    logger.warning("unable to find room for pres: " + pres + ". IGNORED.");
                }
            } else {
                rt = room.getString("rt");
            }
        } catch (JSONException e) {
            logger.warning("unable to parse presentation header json: " + jsonStr + ". IGNORED." + e);
        }
        return rt;
    }

    private void maybeScheduleNextCheck(DatastoreService ds, Date date) {
        List<Entity> nextPresentationToClose = ds.prepare(new Query("PresentationHeader")
                .addFilter("toTime", Query.FilterOperator.GREATER_THAN, date)
                .addSort("toTime", Query.SortDirection.ASCENDING))
                .asList(FetchOptions.Builder.withLimit(1));

        List<Entity> nextPresentationToOpen = ds.prepare(new Query("PresentationHeader")
                .addFilter("fromTime", Query.FilterOperator.GREATER_THAN, date)
                .addSort("fromTime", Query.SortDirection.ASCENDING))
                .asList(FetchOptions.Builder.withLimit(1));

        Date nextCheck = null;
        if (!nextPresentationToClose.isEmpty()) {
            nextCheck = (Date) nextPresentationToClose.get(0).getProperty("toTime");
        }
        if (!nextPresentationToOpen.isEmpty()) {
            Date nextOpenTime = (Date) nextPresentationToOpen.get(0).getProperty("fromTime");
            nextCheck = (nextCheck == null || nextCheck.compareTo(nextOpenTime) > 0) ? nextOpenTime : nextCheck;
        }

        if (nextCheck != null) {
            logger.info("scheduling next check at " + nextCheck);
            Queue queue = QueueFactory.getQueue("schedule");
            queue.purge();
            queue.add(TaskOptions.Builder.withUrl("/t/schedule/check")
                        .etaMillis(nextCheck.getTime()));

        } else {
            logger.info("no next check to schedule");
        }
    }
}

package voxxr.web;

import com.google.appengine.api.datastore.*;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;
import com.google.common.io.ByteStreams;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

/**
 */
public class SpeakerPictureResources implements RestRouter.RequestHandler {
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, Map<String, String> params) throws IOException {
        String kind = "Speaker";
        final String speakerId = params.get("speakerId");
        MemcacheService images = MemcacheServiceFactory.getMemcacheService("images");
        if ("GET".equalsIgnoreCase(req.getMethod())) {
            final String format = params.get("format");
            try {
                Key key = Rests.createKey(kind, speakerId);
                String cacheKey = KeyFactory.keyToString(key);
                Blob blob = (Blob) images.get(cacheKey);
                if (blob == null) {
                    blob = (Blob) Rests.findEntityByKey(key).getProperty("picture");
                    if (blob == null) {
                        resp.sendError(404);
                        return;
                    }
                    images.put(cacheKey, blob);
                }
                Rests.sendImage(blob.getBytes(), format, resp);
            } catch (EntityNotFoundException e) {
                resp.sendError(404);
            }

        } else if ("PUT".equalsIgnoreCase(req.getMethod())) {
            DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
            try {
                Entity entity = Rests.findEntityByKey(Rests.createKey(kind, speakerId));
                entity.setProperty("picture", new Blob(ByteStreams.toByteArray(req.getInputStream())));
                datastore.put(entity);
                Rests.clearEntityCache(entity.getKey());
                images.delete(KeyFactory.keyToString(entity.getKey()));
                Rests.sendJson("{\"status\":\"ok\"}", resp);
            } catch (EntityNotFoundException e) {
                resp.sendError(404);
            }
        }
    }
}



package voxxr.web;

import com.google.appengine.api.datastore.Entity;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * User: xavierhanin
 * Date: 2/13/12
 * Time: 10:18 PM
 */
public interface PrepareEntityCallback {
    Entity prepare(JSONObject json, Entity entity) throws JSONException;
}

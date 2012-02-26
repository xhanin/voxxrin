package voxxr.data;

import java.math.BigDecimal;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * User: xavierhanin
 * Date: 2/26/12
 * Time: 10:23 AM
 */
public class CassandraVoxxrRepository implements VoxxrRepository {
    private final static CassandraVoxxrRepository repository = new CassandraVoxxrRepository();

    public static VoxxrRepository getInstance() {
        return repository;
    }

    private ConcurrentMap<String, MeanRating> roomRatings = new ConcurrentHashMap<String, MeanRating>();

    private CassandraVoxxrRepository() {
    }

    public void store(EV ev) {
        if (EV.Type.RATE.equals(ev.getType())) {
            getRoomMeanRating(ev.getRoom()).update(new BigDecimal(ev.getValue()));
        }
        // TODO: store in cassandra
    }

    public MeanRating getRoomMeanRating(String room) {
        MeanRating rating = roomRatings.get(room);
        if (rating != null) {
            return rating;
        }
        roomRatings.putIfAbsent(room, new ShardedMeanRating(room, 16));
        return roomRatings.get(room);
    }
}

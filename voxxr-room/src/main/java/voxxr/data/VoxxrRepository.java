package voxxr.data;

/**
 * User: xavierhanin
 * Date: 2/26/12
 * Time: 8:59 AM
 */
public interface VoxxrRepository {
    public void store(EV ev);
    public MeanRating getRoomMeanRating(String room);
}

package voxxr.data;

/**
 * User: xavierhanin
 * Date: 2/26/12
 * Time: 10:52 AM
 */
public class Room {
    private static final Room INSTANCE = new Room();

    public static Room getCurrent() {
        return INSTANCE;
    }

    private String id = "r1";
    private String name;

    private Presentation currentPres = new Presentation();

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Presentation getCurrentPres() {
        return currentPres;
    }
}

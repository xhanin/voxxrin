package voxxr.data;

import voxxr.Env;

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

    private String id = Env.getRoom();
    private String name;

    private Presentation currentPres;

    public String getId() {
        return id;
    }

    public Presentation getCurrentPres() {
        return currentPres;
    }

    public void setCurrentPres(Presentation currentPres) {
        this.currentPres = currentPres;
    }
}

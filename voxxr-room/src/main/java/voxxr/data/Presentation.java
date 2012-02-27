package voxxr.data;

/**
 * User: xavierhanin
 * Date: 2/26/12
 * Time: 10:53 AM
 */
public class Presentation {
    private String id;
    private String title;

    public Presentation(String id, String title) {
        this.id = id;
        this.title = title;
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }
}

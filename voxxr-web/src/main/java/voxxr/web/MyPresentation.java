package voxxr.web;

/**
 * User: xavierhanin
 * Date: 3/31/12
 * Time: 2:55 PM
 */
public class MyPresentation {
    private final String presentationId;
    private final User user;
    private boolean favorite;

    public MyPresentation(String presentationId, User user) {
        this.presentationId = presentationId;
        this.user = user;
    }

    public String getPresentationId() {
        return presentationId;
    }

    public User getUser() {
        return user;
    }

    public boolean isFavorite() {
        return favorite;
    }

    public MyPresentation setFavorite(boolean favorite) {
        this.favorite = favorite;
        return this;
    }
}

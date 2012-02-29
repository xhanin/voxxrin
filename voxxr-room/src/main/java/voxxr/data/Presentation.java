package voxxr.data;

/**
 * User: xavierhanin
 * Date: 2/26/12
 * Time: 10:53 AM
 */
public class Presentation {
    private String id;
    private String title;
    private volatile double hotFactor;
    private volatile long lastHotFactorDecrease;

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


    @Override
    public String toString() {
        return "Presentation{" +
                "id='" + id + '\'' +
                ", title='" + title + '\'' +
                '}';
    }

    public double getHotFactor() {
        checkHotFactorDecrease();
        return hotFactor;
    }

    public void updateHotFactor(EV ev) {
        checkHotFactorDecrease();
        hotFactor += ev.getHotFactorPoints();
        hotFactor = Math.max(hotFactor, 0);
    }

    private void checkHotFactorDecrease() {
        if (System.currentTimeMillis() - lastHotFactorDecrease > 1000) {
            hotFactor = hotFactor * 0.9;
            if (hotFactor < 0.009) {
                hotFactor = 0;
            }
            lastHotFactorDecrease = System.currentTimeMillis();
        }
    }
}

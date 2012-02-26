package voxxr.data;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * User: xavierhanin
 * Date: 2/26/12
 * Time: 9:05 AM
 */
public class SimpleMeanRating implements MeanRating {
    private final String name;
    private long ratingsCount = 0;
    private BigDecimal rate = BigDecimal.ZERO;

    public SimpleMeanRating(String name) {
        this.name = name;
    }

    public synchronized void update(BigDecimal r) {
        BigDecimal t = rate.multiply(BigDecimal.valueOf(ratingsCount));
        ratingsCount++;
        rate = t.add(r).divide(BigDecimal.valueOf(ratingsCount), 8, RoundingMode.HALF_UP);
    }

    public synchronized String getName() {
        return name;
    }

    public synchronized long getRatingsCount() {
        return ratingsCount;
    }

    public synchronized BigDecimal getRate() {
        return rate;
    }
}

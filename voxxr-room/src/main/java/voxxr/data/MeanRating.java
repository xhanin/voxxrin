package voxxr.data;

import java.math.BigDecimal;

/**
 * User: xavierhanin
 * Date: 2/26/12
 * Time: 9:05 AM
 */
public interface MeanRating {
    public void update(BigDecimal r);
    public String getName();
    public long getRatingsCount();
    public BigDecimal getRate();
}

package voxxr.data;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Random;

/**
 * User: xavierhanin
 * Date: 2/26/12
 * Time: 9:20 AM
 */
public class ShardedMeanRating implements MeanRating {
    private final MeanRating[] shards;
    private final String name;
    private final Random generator = new Random();

    public ShardedMeanRating(String name, int shardCount) {
        this.name = name;
        shards = new MeanRating[shardCount];
        for (int i = 0; i < shards.length; i++) {
            shards[i] = new SimpleMeanRating(name);
        }
    }

    public void update(BigDecimal r) {
        int shard = generator.nextInt(shards.length);
        shards[shard].update(r);
    }

    public String getName() {
        return name;
    }

    public long getRatingsCount() {
        long c = 0;
        for (int i = 0; i < shards.length; i++) {
            c += shards[i].getRatingsCount();
        }
        return c;
    }

    public BigDecimal getRate() {
        BigDecimal sum = BigDecimal.ZERO;
        long ratingsCount = 0;
        for (int i = 0; i < shards.length; i++) {
            MeanRating rating = shards[i];
            long count = rating.getRatingsCount();
            sum = sum.add(rating.getRate().multiply(BigDecimal.valueOf(count)));
            ratingsCount += count;
        }
        return ratingsCount == 0 ? BigDecimal.ZERO :
                sum.divide(BigDecimal.valueOf(ratingsCount), 8, RoundingMode.HALF_UP);
    }
}

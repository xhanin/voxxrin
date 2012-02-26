package voxxr.data;

import org.junit.Assert;
import org.junit.Test;

import java.math.BigDecimal;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;


/**
 * User: xavierhanin
 * Date: 2/26/12
 * Time: 9:09 AM
 */
public class MeanRatingTest {
    @Test
    public void shouldComputeMean() {
        MeanRating mean = newMeanRating();

        mean.update(BigDecimal.valueOf(3));
        assertEquals(BigDecimal.valueOf(3), mean.getRate());
        assertEquals(1, mean.getRatingsCount());

        mean.update(BigDecimal.valueOf(4));
        assertEquals(BigDecimal.valueOf(35, 1), mean.getRate());
        assertEquals(2, mean.getRatingsCount());

    }

    @Test
    public void shouldKeepMeanWithManyUpdates() {
        MeanRating mean = newMeanRating();

        for (int i=0; i<100; i++) {
            mean.update(BigDecimal.valueOf(3));
            assertEquals(BigDecimal.valueOf(3), mean.getRate());
            assertEquals(i+1, mean.getRatingsCount());
        }
    }


    @Test
    public void shouldHandleConcurrency() throws InterruptedException {
        final MeanRating mean = newMeanRating();

        long start = System.currentTimeMillis();
        ExecutorService executorService = Executors.newFixedThreadPool(8);
        for (int i=0; i<10000; i++) {
            executorService.submit(new Runnable() {
                public void run() {
                    for (int i = 0; i < 50; i++) {
                        mean.update(BigDecimal.valueOf(2));
                        mean.update(BigDecimal.valueOf(4));
                    }
                }
            });
        }
        executorService.shutdown();
        executorService.awaitTermination(5, TimeUnit.SECONDS);
        Assert.assertTrue(BigDecimal.valueOf(3).subtract(mean.getRate()).abs().compareTo(BigDecimal.valueOf(1, 5)) < 0);
        long elapsed = System.currentTimeMillis() - start;
        System.out.println("updated " + mean.getRatingsCount() + " times in " + elapsed + "ms (" + (mean.getRatingsCount() / elapsed) + "/s)");
        assertEquals(10000 * 50 * 2, mean.getRatingsCount());
    }

    private MeanRating newMeanRating() {
//        return new SimpleMeanRating("r1");
        return new ShardedMeanRating("r1", 16);
    }

    private void assertEquals(long expected, long actual) {
        Assert.assertEquals(expected, actual);
    }

    private void assertEquals(BigDecimal expected, BigDecimal actual) {
        Assert.assertTrue("Excepted: " + expected + "\nActual: " + actual, expected.compareTo(actual) == 0);
    }
}

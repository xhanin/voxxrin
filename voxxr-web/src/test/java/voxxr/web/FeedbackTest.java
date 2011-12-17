package voxxr.web;

import org.junit.Assert;
import org.junit.Test;

/**
 * User: xavierhanin
 * Date: 12/17/11
 * Time: 1:12 PM
 */
public class FeedbackTest {

    @Test
    public void shouldParse() {
        FeedbackResource.Feedback f = FeedbackResource.Feedback.parse("12345|xavierhanin|R2");

        Assert.assertEquals("12345", f.room);
        Assert.assertEquals("xavierhanin", f.user);
        Assert.assertEquals("R2", f.value);
    }

    @Test
    public void shouldToString() {
        FeedbackResource.Feedback f = FeedbackResource.Feedback.parse("12345|xavierhanin|R2");
        Assert.assertEquals("12345|xavierhanin|R2", f.toString());
    }
}

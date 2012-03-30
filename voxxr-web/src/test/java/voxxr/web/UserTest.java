package voxxr.web;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

/**
 * User: xavierhanin
 * Date: 3/30/12
 * Time: 11:05 PM
 */
public class UserTest {

    @Test
    public void shouldParseAuthorization() {
        assertUserIs("123", "123", null, User.authenticate("a@123"));
        assertUserIs("xh", "123", null, User.authenticate("xh@123"));
        assertUserIs("xavierhanin", "123", 9150L, User.authenticate("xavierhanin(9150)@123"));
    }

    private void assertUserIs(String id, String device, Long twitterid, User u) {
        assertEquals(id, u.getId());
        assertEquals(device, u.getDeviceid());
        assertEquals(twitterid, u.getTwitterid());
    }
}

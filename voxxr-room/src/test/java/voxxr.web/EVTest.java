package voxxr.web;

import org.junit.Assert;
import org.junit.Test;
import voxxr.data.EV;

/**
 * User: xavierhanin
 * Date: 12/17/11
 * Time: 1:12 PM
 */
public class EVTest {

    @Test
    public void shouldParse() {
        EV f = EV.parse("r1", "xavierhanin|R2");

        Assert.assertEquals("xavierhanin", f.getUser());
        Assert.assertEquals(EV.Type.RATE, f.getType());
        Assert.assertEquals("2", f.getValue());
    }

    @Test
    public void shouldBCBeSymetric() {
        EV f = EV.parse("r1", "xavierhanin|R2");
        Assert.assertEquals("xavierhanin|R2", f.toBC());
    }
}

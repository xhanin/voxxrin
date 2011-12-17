package voxxr.web;

import javax.servlet.ServletContext;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.PathSegment;
import java.io.InputStream;

@Path("/")
public class FileResource {

    private
    @Context
    ServletContext sc;

    @Path("/assets/js/libs/{path}")
    @GET
    public InputStream getJsLibs(@PathParam("path") PathSegment ps) {
        return sc.getResourceAsStream("/assets/js/libs/" + ps.getPath());
    }

    @Path("/assets/js/{path}")
    @GET
    public InputStream getJs(@PathParam("path") PathSegment ps) {
        return sc.getResourceAsStream("/assets/js/" + ps.getPath());
    }

    @Path("/assets/css/{path}")
    @GET
    public InputStream getCss(@PathParam("path") PathSegment ps) {
        return sc.getResourceAsStream("/assets/css/" + ps.getPath());
    }

    @Path("/assets/img/{path}")
    @GET
    public InputStream getUmg(@PathParam("path") PathSegment ps) {
        return sc.getResourceAsStream("/assets/img/" + ps.getPath());
    }

    @Produces("text/html")
    @GET
    public InputStream getIndex() {
        return sc.getResourceAsStream("/voxxr.html");
    }
}

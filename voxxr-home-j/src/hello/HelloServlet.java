package hello;

import java.io.IOException;

/**
 * User: xavierhanin
 * Date: 1/15/12
 * Time: 4:40 PM
 */
public class HelloServlet extends javax.servlet.http.HttpServlet {
    protected void doPost(javax.servlet.http.HttpServletRequest request, javax.servlet.http.HttpServletResponse response) throws javax.servlet.ServletException, IOException {

    }

    protected void doGet(javax.servlet.http.HttpServletRequest request, javax.servlet.http.HttpServletResponse resp) throws javax.servlet.ServletException, IOException {
        resp.setContentType("text/plain");
        resp.getWriter().println("Hello, world");
    }
}

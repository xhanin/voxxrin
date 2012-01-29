package voxxr.web;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * User: xavierhanin
 * Date: 1/28/12
 * Time: 8:51 PM
 */
public class NowPlayingResources extends HttpServlet {
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

    }

    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        response.addHeader("Content-Type", "application/json");
        response.addHeader("Access-Control-Allow-Origin", "*");
        response.getWriter().write("[" +
                "{\"id\":\"1\", \"title\":\"Ze Highly Interactive Talk\", \"speakers\": [\"Xavier Hanin\"], \"start\": \"7pm\", \"room\": {\"id\":\"1\", \"name\": \"Room 1\"}}," +
                "{\"id\":\"2\", \"title\":\"Neo4J\", \"speakers\": [\"TRE TRE\", \"DFG DFG\"], \"start\": \"7pm\", \"room\": {\"id\":\"1\", \"name\": \"Room 1\"}}" +
                "]");
    }
}



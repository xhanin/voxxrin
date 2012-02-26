package voxxr;

/**
 * User: xavierhanin
 * Date: 2/26/12
 * Time: 11:47 AM
 */
public class Env {
    private static String room;
    private static String cassandraClusterHosts;

    static {
        room = "r1";
        cassandraClusterHosts = "127.0.0.1:9160";
    }

    public static String getRoom() {
        return room;
    }

    public static String getCassandraClusterHosts() {
        return cassandraClusterHosts;
    }
}

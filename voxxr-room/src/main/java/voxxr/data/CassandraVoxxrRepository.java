package voxxr.data;

import me.prettyprint.cassandra.model.ConfigurableConsistencyLevel;
import me.prettyprint.cassandra.serializers.UUIDSerializer;
import me.prettyprint.hector.api.Cluster;
import me.prettyprint.hector.api.HConsistencyLevel;
import me.prettyprint.hector.api.Keyspace;
import me.prettyprint.hector.api.factory.HFactory;
import me.prettyprint.hector.api.mutation.MutationResult;
import me.prettyprint.hector.api.mutation.Mutator;
import voxxr.Env;

import java.math.BigDecimal;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * User: xavierhanin
 * Date: 2/26/12
 * Time: 10:23 AM
 */
public class CassandraVoxxrRepository implements VoxxrRepository {
    private final static CassandraVoxxrRepository repository = new CassandraVoxxrRepository();

    public static VoxxrRepository getInstance() {
        return repository;
    }

    private ConcurrentMap<String, MeanRating> roomRatings = new ConcurrentHashMap<String, MeanRating>();
    private Properties properties;
    private Cluster voxxrCluster;
    private Keyspace voxxrKeyspace;

    private CassandraVoxxrRepository() {
        properties = new Properties();

        voxxrCluster = HFactory.getOrCreateCluster(
                properties.getProperty("cluster.name", "VoxxrCluster"),
                properties.getProperty("cluster.hosts", Env.getCassandraClusterHosts()));
        ConfigurableConsistencyLevel ccl = new ConfigurableConsistencyLevel();
        ccl.setDefaultReadConsistencyLevel(HConsistencyLevel.ONE);
        voxxrKeyspace = HFactory.createKeyspace(
                properties.getProperty("voxxr.keyspace", "Voxxr"),
                voxxrCluster, ccl);
    }

    public void store(EV ev) {
        if (EV.Type.RATE.equals(ev.getType())) {
            getPresMeanRating(ev.getPres()).update(new BigDecimal(ev.getValue()));
        }

        Mutator<UUID> mutator = HFactory.createMutator(voxxrKeyspace, UUIDSerializer.get());
        mutator.addInsertion(ev.getKey(), "EV", HFactory.createStringColumn("pres", ev.getPres()));
        mutator.addInsertion(ev.getKey(), "EV", HFactory.createStringColumn("user", ev.getUser()));
        mutator.addInsertion(ev.getKey(), "EV", HFactory.createStringColumn("type", ev.getType().getCode()));
        mutator.addInsertion(ev.getKey(), "EV", HFactory.createStringColumn("value", ev.getValue()));

        MutationResult mr = mutator.execute();
        System.out.println("inserted EV in " + mr.getExecutionTimeMicro() + "us");
    }

    public MeanRating getPresMeanRating(String pres) {
        MeanRating rating = roomRatings.get(pres);
        if (rating != null) {
            return rating;
        }
        roomRatings.putIfAbsent(pres, new ShardedMeanRating(pres, 16));
        return roomRatings.get(pres);
    }
}

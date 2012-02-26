-- start cassandra
~/dev/tools/cassandra/apache-cassandra-1.0.3/bin/cassandra -f

-- create schema
~/dev/tools/cassandra/apache-cassandra-1.0.3/bin/cassandra-cli -h 127.0.0.1 -p 9160 < src/main/scripts/cassandra-schema.txt
#!/bin/sh

INSTANCE=$1
SEED_IP=$2
TOKEN=$3
HOST=$4

VOXXR_HOME=~/dev/wkspace/voxxr/voxxr

echo "login and RSA accept"
ovhcloud instance ssh $INSTANCE ls

echo "uploading files..."
ovhcloud instance ssh $INSTANCE copy $VOXXR_HOME/voxxr-room/src/main/scripts/cassandra-schema-create-keyspace.txt "cassandra-schema-create-keyspace.txt"
ovhcloud instance ssh $INSTANCE copy $VOXXR_HOME/voxxr-room/src/main/scripts/cassandra-schema.txt "cassandra-schema.txt"
ovhcloud instance ssh $INSTANCE copy $VOXXR_HOME/voxxr-room/src/main/scripts/cassandra.yaml "cassandra.yaml"
ovhcloud instance ssh $INSTANCE copy $VOXXR_HOME/voxxr-room/src/main/scripts/cassandra-env.sh "cassandra-env.sh"
ovhcloud instance ssh $INSTANCE copy $VOXXR_HOME/voxxr-room/src/main/scripts/deploy-cassandra-remote.sh "install.sh"

echo "executing remote install..."
echo "ssh install.sh $SEED_IP $TOKEN $HOST"
ovhcloud instance ssh $INSTANCE bash "./install.sh" $SEED_IP $TOKEN $HOST

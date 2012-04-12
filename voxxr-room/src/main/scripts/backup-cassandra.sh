#!/bin/sh

INSTANCE=$1
HOST=$2
DATE=$3

VOXXR_HOME=~/dev/wkspace/voxxr/voxxr

echo "login and RSA accept"
ovhcloud instance ssh $INSTANCE ls

echo "uploading backup script file..."
ovhcloud instance ssh $INSTANCE copy $VOXXR_HOME/voxxr-room/src/main/scripts/backup-cassandra-remote.sh "backup.sh"

echo "executing remote backup..."
echo "ssh backup.sh $HOST $DATE"
ovhcloud instance ssh $INSTANCE bash "./backup.sh" $HOST $DATE


echo "downloading backup file..."
ovhcloud instance ssh $INSTANCE copy ":c${HOST}-${DATE}.tgz" $VOXXR_HOME/backups/c${HOST}-${DATE}.tgz
#!/bin/sh

HOST=$1
DATE=$2
echo "----------- CASSANDRA NODE BACKUP"
echo "- HOST=$HOST"

nodetool -h localhost -p 7199 snapshot Voxxr
tar czvf c${HOST}-${DATE}.tgz /var/lib/cassandra/data/Voxxr/snapshots

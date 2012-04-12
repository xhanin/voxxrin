#!/bin/sh

DATE=`date +%Y%m%d%H%M`
NODES=( 69446 69447 69448 )
HOSTS=( voxxr-c4 voxxr-c5 voxxr-c6 )
VOXXR_HOME=~/dev/wkspace/voxxr/voxxr

echo "backuping nodes"

for ((i=0; i < ${#NODES[@]}; i++)); do
  echo "calling backup cassandra ${NODES[$i]} ${HOSTS[$i]} $DATE"
  $VOXXR_HOME/voxxr-room/src/main/scripts/backup-cassandra.sh ${NODES[$i]} ${HOSTS[$i]} $DATE
done

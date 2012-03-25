#!/bin/sh

INSTANCE=$1
ROOM=$2
HOST=$3
VOXXR_HOME=~/dev/wkspace/voxxr/voxxr
SEED_IP=`cat $VOXXR_HOME/voxxr-room/current-seed-ip`

cd $VOXXR_HOME && tar czvf out/production/voxxr-room.tgz voxxr-room && cd -

echo "starting instance"
ovhcloud instance startInstance --instanceId $INSTANCE
echo "waiting for room node $ROOM to startup..."
ROOM_IP=''
while [ "$ROOM_IP" = "" ]; do
 ROOM_IP=`ovhcloud instance getInstances --projectName voxxr | grep $INSTANCE | egrep -o '([0-9]+\.)+[0-9]+'`;
done

echo "login and RSA accept"
ovhcloud instance ssh $INSTANCE ls

echo "uploading files..."
ovhcloud instance ssh $INSTANCE copy $VOXXR_HOME/voxxr-room/src/main/scripts/deploy-room-remote.sh "install.sh"
ovhcloud instance ssh $INSTANCE copy $VOXXR_HOME/voxxr-room/src/main/scripts/voxxr-room.properties "voxxr-room.properties"
ovhcloud instance ssh $INSTANCE copy $VOXXR_HOME/out/production/voxxr-room.tgz "voxxr-room.tgz"

echo "executing remote install..."
ovhcloud instance ssh $INSTANCE bash "./install.sh" $ROOM  $SEED_IP $HOST $ROOM_IP


echo "ROOM $ROOM STARTED AT IP $ROOM_IP"
echo "VOXXR-ROOM::$ROOM::$ROOM_IP"
#!/bin/sh

INSTANCE=65102
VOXXR_HOME=~/dev/wkspace/voxxr/voxxr

cd $VOXXR_HOME && tar czvf out/production/voxxr-room.tgz voxxr-room && cd -

echo "uploading files..."
ovhcloud instance ssh $INSTANCE copy $VOXXR_HOME/voxxr-room/src/main/scripts/deploy-room-remote.sh "install.sh"
ovhcloud instance ssh $INSTANCE copy $VOXXR_HOME/out/production/voxxr-room.tgz "voxxr-room.tgz"

echo "executing remote install..."
ovhcloud instance ssh $INSTANCE bash "./install.sh"

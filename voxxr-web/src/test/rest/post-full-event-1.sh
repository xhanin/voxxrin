#!/bin/sh

SERVER=$1
TOKEN=$2

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

bash $DIR/post-events.sh $SERVER $TOKEN
bash $DIR/post-day-schedule-1-1.sh $SERVER $TOKEN
bash $DIR/post-presentation-1-1.sh $SERVER $TOKEN
bash $DIR/post-room-1.sh $SERVER $TOKEN

echo done.

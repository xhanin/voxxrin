#!/bin/sh

SERVER=$1
TOKEN=$2

curl   --header "Content-type: application/json" --header "Authorization: ${TOKEN}" --request POST  --data @src/test/rest/dayschedule-1-1.json  ${SERVER}/r/events/1/day/1
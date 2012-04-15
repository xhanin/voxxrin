#!/bin/sh

SERVER=$1
TOKEN=$2

curl   --header "Content-type: application/json" --header "Authorization: ${TOKEN}" --request POST  --data @src/test/rest/event.bxjug.json  ${SERVER}/r/events
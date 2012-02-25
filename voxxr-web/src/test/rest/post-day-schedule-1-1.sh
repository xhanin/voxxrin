#!/bin/sh

curl   --header "Content-type: application/json" --header "Authorization: Qh12EEHzVPn2AkKfihVs" --request POST  --data @src/test/rest/dayschedule-1-1.json  http://localhost:8080/r/events/1/day/1
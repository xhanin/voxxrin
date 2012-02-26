#!/bin/sh

apt-get update
apt-get install -y openjdk-6-jdk ant git-core
wget -q http://search.maven.org/remotecontent?filepath=org/apache/ivy/ivy/2.2.0/ivy-2.2.0.jar -O /usr/share/ant/lib/ivy.jar

tar xzvf voxxr-room.tgz

cd voxxr-room

echo "------- LAUNCHING"
ant run &

#!/bin/sh

ROOM=$1
SEED_IP=$2
HOST=$3
ROOM_IP=$4
JVMMS=$5
JVMMX=$6

# set host name, it happens from time to time that machine initialized by ovh has localhost.localdomain as hostname :(
echo $HOST > /etc/hostname
hostname $HOST
# FIX DNS set host name in /etc/hosts
sed -i s/\ localhost/\ localhost\ `hostname`/g /etc/hosts


apt-get update
apt-get install -y openjdk-6-jdk ant git-core
wget -q http://search.maven.org/remotecontent?filepath=org/apache/ivy/ivy/2.2.0/ivy-2.2.0.jar -O /usr/share/ant/lib/ivy.jar

tar xzvf voxxr-room.tgz

echo "------- CONFIGURING -- ROOM => $ROOM -- SEED_IP => $SEED_IP"
sed -i s/@ROOM@/$ROOM/g voxxr-room.properties
sed -i s/@SEED_IP@/$SEED_IP/g voxxr-room.properties
sed -i s/@ROOM_IP@/$ROOM_IP/g voxxr-room.properties
sed -i s/@JVMMS@/$JVMMS/g voxxr-room.properties
sed -i s/@JVMMX@/$JVMMX/g voxxr-room.properties

cp -f voxxr-room.properties voxxr-room/src/main/java/

cd voxxr-room

echo "------- PACKAGING"
ant -Dskip.deps=true package

echo "------- LAUNCHING"
ant -Dskip.deps=true run &>ant.log &

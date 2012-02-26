#!/bin/sh

SEED_IP=$1
TOKEN=$2
HOST=$3
INSTANCEIP=`ifconfig eth0 | awk '/inet addr/ {split ($2,A,":"); print A[2]}'`
echo "----------- CASSANDRA NODE INSTALLATION"
echo "- SEED=$SEED_IP ; IP=$INSTANCEIP ; TOKEN=$TOKEN ; HOST=$HOST"


# set host name, it happens from time to time that machine initialized by ovh has localhost.localdomain as hostname :(
echo $HOST > /etc/hostname
hostname $HOST
# FIX DNS set host name in /etc/hosts
sed -i s/\ localhost/\ localhost\ `hostname`/g /etc/hosts

echo "deb http://www.apache.org/dist/cassandra/debian 10x main" >> /etc/apt/sources.list
echo "deb-src http://www.apache.org/dist/cassandra/debian 10x main" >> /etc/apt/sources.list
gpg --keyserver pgp.mit.edu --recv-keys F758CE318D77295D
gpg --export --armor F758CE318D77295D | sudo apt-key add -
gpg --keyserver pgp.mit.edu --recv-keys 2B5C1B00
gpg --export --armor 2B5C1B00 | sudo apt-key add -
sleep 2
sudo apt-get update
sleep 2
sudo apt-get install -y cassandra

echo "----------- CASSANDRA NODE SETUP"
cp -f cassandra.yaml /etc/cassandra/cassandra.yaml
cp -f cassandra-env.sh /etc/cassandra/cassandra-env.sh
chmod +x /etc/cassandra/cassandra-env.sh

sed -i s/@MY_IP@/$INSTANCEIP/g /etc/cassandra/cassandra.yaml
sed -i s/@SEED_IP@/$SEED_IP/g /etc/cassandra/cassandra.yaml
sed -i s/@TOKEN@/$TOKEN/g /etc/cassandra/cassandra.yaml

echo "------------ STARTING CASSANDRA NODE"
service cassandra start
sleep 2


if [ "$TOKEN" = "0" ]
then
  echo "------------ CREATING SCHEMA"
  cassandra-cli -h $INSTANCEIP -p 9160 < cassandra-schema-create-keyspace.txt
  sleep 2
  cassandra-cli -h $INSTANCEIP -p 9160 < cassandra-schema.txt
fi

echo "CASSANDRA NODE SHOULD BE READY NOW"
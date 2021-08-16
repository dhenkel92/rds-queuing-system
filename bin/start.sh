#! /bin/bash

set -ex

docker-compose up -d mysql
# Wait for mysql to properly startup
sleep 15
docker exec -i queue_mysql mysql -uroot -proot queue < documents/queue.sql

docker-compose up -d

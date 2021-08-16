#! /bin/bash

set -ex

docker-compose stop
yes | docker-compose rm

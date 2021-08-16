# RDS Queuing System

## Motivation

Sometimes, you need a queuing system in order to execute asynchronous tasks.
Unfortunately, all the applications, like Kafka or RabbitMQ, require a lot of maintenance and resources that you might not want to spend in simple systems.

So, this example repository is showing a simple and scalable implementation of a queuing system based on a relational database.

## How to run it

In order to properly startup the system from scratch

Start the system:
```shell script
$> ./bin/start.sh
```

Stop the system:
```shell script
$> ./bin/stop.sh
```

## Requirements

The following requirements were set in order to create a proper, scalable system:

* A message should be requeued if the consumer was shutdown / failed while processing
* A message should not be consumed multiple times
* It should be possible to horizontally scale the consumer

## Solution
The main building block is the possibility to use different [isolation levels](https://en.wikipedia.org/wiki/Isolation_(database_systems)) within a session / application.

For our consumer we are using the 'dirty reads' feature, which basically means that we can read the updates of other uncommitted transactions.
Normally you don't want to have this behavior as it can lead to ghost reads.

In our case, we are using this feature in order to see which messages are currently consumed by other processes without needing to commit their changes.
This solves the problem that we would like to reprocessed message when the consumer failed or was stopped.

Nevertheless, one should always create two connections. One where read uncommitted is active and one with the default isolation level, which should be used as a default connection.

The first implementation was just an update query like:
```sql
UPDATE task SET uuid = ? WHERE uuid is null
```
The problem was that, if you want to start multiple consumers, the first one will pick up the first message and lock this row. 
Then, when the second starts, it wants to consume the same message, so it's waiting for the lock which happens continually. 
So the result is a sequential system where we only consume one message at a time even if we have multiple consumers.

One might think now "We've explicitly set the session to READ UNCOMMITTED", so it should ignore what the first consumer is doing. 
"Unfortunately" this is a wrong assumption as READ UNCOMMITTED is only changing the behavior of selects and not updates or deletes.

So the final solution was to first select the proper id of the task we want to consume and then update only this specific row. 
With this we are using the lower isolation level to see which messages are currently consumed by other processes, and we can lock only the row we need.

Nevertheless, there is still one downside. Unfortunately you cannot select and update the same table in the same query. 
The resolution was to use sub, sub queries that are creating a temp table. Sadly this results in a non atomic operation, which means that, with higher concurrency, we might want to lock the same row twice.


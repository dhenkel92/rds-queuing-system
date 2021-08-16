import { v4 } from "uuid";
import { MysqlAdapter } from "./adapters/MysqlAdapter";
import { randomTimeout } from "./helper";

export class Consumer {
    private readonly consumerId: string;

    constructor(
        private adapter: MysqlAdapter,
        private dirtyAdapter: MysqlAdapter,
    ) {
        this.consumerId = v4();
    }

    public async consumeMessage(consumeTimeoutMin: number, consumeTimeoutMax: number): Promise<any> {
        const messageUUID = v4();

        await this.dirtyAdapter.beginTransaction();
        // The first implementation was just an update query like:
        // UPDATE task SET uuid = ? WHERE uuid is null
        // The problem was that if you want to start multiple consumers, the first one will pick up the first message and
        // lock this row. Then, when the second start, it wants to consume the same message, so it's waiting for the lock
        // which happens continually. So the result is a sequential system where we only consume one message at a time
        // even if we have multiple consumers.

        // One might think now "We've explicitly set the session to READ UNCOMMITTED" so it should ignore what the first
        // consumer is doing. "Unfortunately" this is a wrong assumption as READ UNCOMMITTED is only changing the
        // behaviour of selects and not updates or deletes.

        // So the final solution was to first select the proper id of the task we want to consume and then update only
        // this specific row. With this we are using the lower isolation level to see which messages are currently
        // consumed by other processes and we can lock only the row we need.

        // Nevertheless there is still one downside. Unfortunately you cannot select and update the same table in the
        // same query. The resolution was to use sub sub queries that are creating a temp table. Sadly this results in
        // a non atomic operation, which means that, with higher concurrency, we might want to lock the same row twice.
        await this.dirtyAdapter.query(`
          UPDATE task SET uuid = ? WHERE id = (SELECT id FROM (SELECT id FROM task WHERE uuid is null limit 1) as temp)
        `, [messageUUID]);
        const messages = await this.dirtyAdapter.query(`SELECT * FROM task WHERE uuid = ?`, [messageUUID]);

        if (messages.length === 0) {
            await this.dirtyAdapter.commit();
            return null;
        }
        const message = messages[0];

        // Just a small log entry in order to be able to check if one message was consumed multiple times
        await this.adapter.query(`INSERT INTO task_log (task_id, consumer_id) VALUES (?, ?)`, [message.id, this.consumerId]);
        // We are waiting for some random amount of time in order to simulate logic that will happening
        // while processing the queue message. The timeout is randomly taken, because then we have a
        // more dynamic system which is less predictable.
        await randomTimeout(consumeTimeoutMin, consumeTimeoutMax);
        await this.dirtyAdapter.commit();

        return message;
    }
}

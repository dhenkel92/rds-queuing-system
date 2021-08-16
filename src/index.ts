import { createMysqlAdapter } from "./adapters/MysqlAdapter";
import { Consumer } from "./consumer";

(async () => {
    try {
        const adapter = await createMysqlAdapter(false);
        const dirtyAdapter = await createMysqlAdapter(true);

        const consumer = new Consumer(adapter, dirtyAdapter);

        while (true) {
            try {
                const message = await consumer.consumeMessage(10, 100);
                console.dir(JSON.stringify(message, null, 4));
            } catch (e) {
                console.error('Consumer error', e);
            }
        }
    } catch (e) {
        console.error('Setup error', e);
    }
})();

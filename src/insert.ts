import { createMysqlAdapter } from "./adapters/MysqlAdapter";
import { timeout } from "./helper";

// This is just a helper tool, which will insert new messages in a certain interval.
(async () => {
    try {
        const adapter = await createMysqlAdapter(false);
        while (true) {
            await adapter.query(`INSERT INTO task (message) VALUES ('msg')`)
            await timeout(10);
        }
    } catch (e) {
        console.error(e);
    }
})();

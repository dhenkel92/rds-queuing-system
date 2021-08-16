import * as mysql from "mysql";
import * as config from 'config';

export class MysqlAdapter {
    constructor(private connection: mysql.Connection) {
    }

    public async query(query, args: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.connection.query(query, args, (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(results);
            });
        });
    }

    public async beginTransaction(): Promise<void> {
        await new Promise((resolve, reject) => {
            this.connection.beginTransaction((err) => {
                if (err) {
                    reject(err);
                    return
                }
                resolve(null);
            })
        })
    }

    public async commit(): Promise<void> {
        await new Promise((resolve, reject) => {
            this.connection.commit((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(null);
            });
        });
    }
}

async function openMysqlConnection(isReadUncommitted: boolean): Promise<mysql.Connection> {
    const conn = mysql.createConnection({
        host: config.get('mysql.host'),
        port: config.get('mysql.port'),
        user: config.get('mysql.user'),
        password: config.get('mysql.password'),
        database: config.get('mysql.database'),
    })
    return new Promise<mysql.Connection>((resolve, reject) => {
        conn.connect((err) => {
            if (err) {
                reject(err);
                return;
            }

            if (!isReadUncommitted) {
                resolve(conn);
                return;
            }

            // This is the main building block of our consumer. We are using the possibility of 'dirty reads', which
            // basically means that we can read the updates of other transactions uncommitted changes.
            // Normally you don't want to have this behaviour as it can lead to ghost reads and unexpected behaviour.

            // In our case we are using this feature in order to see which messages are currently consumed by other
            // processes without needing to commit their changes. This solves the problem that we would like to reprocess
            // a message when the consumer failed or was stopped.

            // Nevertheless one should always create two connections. One where read uncommitted is active and one with
            // the default isolation level, which should be used as a default connection.
            conn.query('SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED', (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(conn);
            })
        })
    });
}

export async function createMysqlAdapter(isReadUncommitted: boolean = false): Promise<MysqlAdapter> {
    return new MysqlAdapter(await openMysqlConnection(isReadUncommitted));
}

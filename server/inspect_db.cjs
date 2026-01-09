const { query, checkConnection } = require('./db.cjs');

async function inspect() {
    await checkConnection();
    try {
        const tables = await query('SHOW TABLES');
        console.log('Tables:', tables);

        for (const t of tables) {
            const tableName = Object.values(t)[0];
            const columns = await query(`DESCRIBE ${tableName}`);
            console.log(`Schema for ${tableName}:`, columns);
        }
    } catch (e) {
        console.error(e);
    }
    process.exit();
}

inspect();

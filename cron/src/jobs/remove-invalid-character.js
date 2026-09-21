// An invalid grant can arrive after a user has reauthorized the character.
// Lock and recheck the stored grant before deleting any character data.
export async function removeInvalidCharacter(database, row) {
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const [grants] = await connection.query(
      'SELECT refreshToken FROM esi WHERE userID = ? AND characterID = ? FOR UPDATE',
      [row.userID, row.characterID],
    );
    if (grants.length !== 1 || grants[0].refreshToken !== row.refreshToken) {
      await connection.rollback();
      return false;
    }

    // Discover every base table with a characterID column, including tables
    // added to an existing installation after this job was written.
    const [tables] = await connection.query(
      `SELECT c.TABLE_NAME AS tableName,
              MAX(c.COLUMN_NAME = 'userID') AS hasUserID
         FROM information_schema.COLUMNS c
         INNER JOIN information_schema.TABLES t
           ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
        WHERE c.TABLE_SCHEMA = DATABASE() AND t.TABLE_TYPE = 'BASE TABLE'
          AND c.COLUMN_NAME IN ('characterID', 'userID')
        GROUP BY c.TABLE_NAME
       HAVING MAX(c.COLUMN_NAME = 'characterID') = 1`,
    );
    // Delete linked data before the grant, and the login identity last.
    const order = (name) => name === 'characters' ? 2 : name === 'esi' ? 1 : 0;
    tables.sort((a, b) => order(a.tableName) - order(b.tableName));
    for (const table of tables) {
      if (!/^[A-Za-z0-9_]+$/.test(table.tableName)) {
        throw new Error('Unexpected character table name');
      }
      await connection.execute(
        `DELETE FROM \`${table.tableName}\` WHERE characterID = ?${Number(table.hasUserID) ? ' AND userID = ?' : ''}`,
        Number(table.hasUserID) ? [row.characterID, row.userID] : [row.characterID],
      );
    }

    const [remaining] = await connection.query(
      'SELECT characterID FROM characters WHERE userID = ? LIMIT 1',
      [row.userID],
    );
    if (remaining.length === 0) {
      // Sessions are checked against characters on each browser refresh.
      // Revoking the remember-me token also prevents automatic sign-in.
      await connection.execute('DELETE FROM tokens WHERE userID = ?', [row.userID]);
      await connection.execute('DELETE FROM active WHERE userID = ?', [row.userID]);
    }
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

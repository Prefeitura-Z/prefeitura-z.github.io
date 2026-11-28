// Implementa as operações D1 usadas pelo Worker para testes locais sobre SQLite.
export function d1(db) {
  function prepare(sql) {
    let args = [];
    const stmt = {
      bind(...a) { args = a; return stmt; },
      first() { return db.prepare(sql).get(...args) ?? null; },
      all() { return { results: db.prepare(sql).all(...args) }; },
      run() {
        if (/^\s*SELECT/i.test(sql)) return { ...stmt.all(), meta: { changes: 0 } };
        const r = db.prepare(sql).run(...args);
        return { results: [], meta: { changes: Number(r.changes) } };
      },
    };
    return stmt;
  }
  return {
    prepare,
    async batch(list) {
      db.exec('BEGIN');
      try {
        const resultado = list.map(s => s.run());
        db.exec('COMMIT');
        return resultado;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

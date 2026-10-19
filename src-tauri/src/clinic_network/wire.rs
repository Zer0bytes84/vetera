//! Conversion between JSON and SQLite values.
//!
//! A remote workstation must see exactly what the local SQL plugin returns:
//! the same bindings on the way in and the same JSON on the way out. Both
//! functions mirror tauri-plugin-sql 2.3 (`wrapper.rs` and `decode/sqlite.rs`,
//! Apache-2.0 / MIT); the parity test below locks that contract.

use indexmap::IndexMap;
use serde_json::Value as JsonValue;
use sqlx::sqlite::{SqliteArguments, SqliteRow, SqliteValueRef};
use sqlx::{query::Query, Column, Row, Sqlite, TypeInfo, Value, ValueRef};
use time::{Date, PrimitiveDateTime, Time};

pub type JsonRow = IndexMap<String, JsonValue>;

pub fn bind_values<'q>(
    sql: &'q str,
    values: Vec<JsonValue>,
) -> Query<'q, Sqlite, SqliteArguments<'q>> {
    let mut query = sqlx::query(sql);
    for value in values {
        if value.is_null() {
            query = query.bind(None::<JsonValue>);
        } else if value.is_string() {
            query = query.bind(value.as_str().unwrap_or_default().to_owned());
        } else if let Some(number) = value.as_number() {
            query = query.bind(number.as_f64().unwrap_or_default());
        } else {
            query = query.bind(value);
        }
    }
    query
}

pub fn row_to_json(row: &SqliteRow) -> Result<JsonRow, String> {
    let mut values = IndexMap::new();
    for (index, column) in row.columns().iter().enumerate() {
        let raw = row.try_get_raw(index).map_err(|e| e.to_string())?;
        values.insert(column.name().to_string(), value_to_json(raw)?);
    }
    Ok(values)
}

fn value_to_json(value: SqliteValueRef) -> Result<JsonValue, String> {
    if value.is_null() {
        return Ok(JsonValue::Null);
    }
    let owned = value.to_owned();
    Ok(match value.type_info().name() {
        "TEXT" => owned.try_decode::<String>().map(JsonValue::String).unwrap_or(JsonValue::Null),
        "REAL" => owned.try_decode::<f64>().map(JsonValue::from).unwrap_or(JsonValue::Null),
        "INTEGER" | "NUMERIC" => owned
            .try_decode::<i64>()
            .map(|v| JsonValue::Number(v.into()))
            .unwrap_or(JsonValue::Null),
        "BOOLEAN" => owned.try_decode::<bool>().map(JsonValue::Bool).unwrap_or(JsonValue::Null),
        "DATE" => owned
            .try_decode::<Date>()
            .map(|v| JsonValue::String(v.to_string()))
            .unwrap_or(JsonValue::Null),
        "TIME" => owned
            .try_decode::<Time>()
            .map(|v| JsonValue::String(v.to_string()))
            .unwrap_or(JsonValue::Null),
        "DATETIME" => owned
            .try_decode::<PrimitiveDateTime>()
            .map(|v| JsonValue::String(v.to_string()))
            .unwrap_or(JsonValue::Null),
        "BLOB" => owned
            .try_decode::<Vec<u8>>()
            .map(|v| JsonValue::Array(v.into_iter().map(|n| JsonValue::Number(n.into())).collect()))
            .unwrap_or(JsonValue::Null),
        "NULL" => JsonValue::Null,
        other => return Err(format!("Type SQLite non pris en charge : {other}")),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use sqlx::{Connection, Executor, SqliteConnection};

    #[test]
    fn decodes_like_the_local_sql_plugin() {
        tauri::async_runtime::block_on(async {
            let mut conn = SqliteConnection::connect("sqlite::memory:").await.unwrap();
            conn.execute(
                "CREATE TABLE t (
                    label TEXT, price REAL, count INTEGER, done BOOLEAN,
                    day DATE, at DATETIME, data BLOB, empty TEXT
                )",
            )
            .await
            .unwrap();
            bind_values(
                "INSERT INTO t VALUES (?, ?, ?, ?, ?, ?, X'0102', ?)",
                vec![
                    json!("Rex"),
                    json!(42.5),
                    json!(3),
                    json!(true),
                    json!("2026-10-19"),
                    json!("2026-10-19 10:00:00"),
                    JsonValue::Null,
                ],
            )
            .execute(&mut conn)
            .await
            .unwrap();
            let row = sqlx::query("SELECT * FROM t").fetch_one(&mut conn).await.unwrap();
            let json = serde_json::to_value(row_to_json(&row).unwrap()).unwrap();
            assert_eq!(json["label"], json!("Rex"));
            assert_eq!(json["price"], json!(42.5));
            // Numbers are bound as f64; INTEGER affinity stores 3.0 back as 3.
            assert_eq!(json["count"], json!(3));
            // The plugin binds JSON booleans as JSON text; useSQLite already
            // normalizes them, so remote rows must keep that exact shape.
            assert_eq!(json["done"], json!("true"));
            assert_eq!(json["day"], json!("2026-10-19"));
            // Values report their storage class, so dates stay plain TEXT.
            assert_eq!(json["at"], json!("2026-10-19 10:00:00"));
            assert_eq!(json["data"], json!([1, 2]));
            assert_eq!(json["empty"], JsonValue::Null);
            let keys: Vec<_> = row_to_json(&row).unwrap().keys().cloned().collect();
            assert_eq!(keys, ["label", "price", "count", "done", "day", "at", "data", "empty"]);
        });
    }
}

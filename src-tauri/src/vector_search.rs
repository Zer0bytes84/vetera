//! Recherche sémantique native : les vecteurs des extraits restent en mémoire côté Rust, la question entre, seuls les
//! identifiants (rowid) et les cosinus ressortent. Le classement (seuils, bonus lexical, meilleur extrait par source)
//! reste celui de rankPassages côté TypeScript ; seul le cosinus change de côté.
//!
//! L'index est relu quand la signature de la table change : le nombre d'extraits du modèle et le compteur de
//! génération que les déclencheurs de la migration 047 incrémentent à chaque insertion, suppression ou mise à jour
//! d'un extrait. Sur un poste client du réseau de la clinique, la recherche s'exécute sur le poste principal.

use serde::{Deserialize, Serialize};
use sqlx::{Row, SqliteConnection};
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_sql::{DbInstances, DbPool};
use tokio::sync::Mutex;

const DIMENSIONS: usize = 768;
const VECTOR_BYTES: usize = DIMENSIONS * 4;
/// Extraits lus par requête au chargement : la mémoire n'a jamais à tenir deux copies de tous les vecteurs.
const LOAD_PAGE: i64 = 2000;

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VectorQuery {
    pub model_key: String,
    /// La question déjà normalisée côté TypeScript (mêmes nombres que son Float64Array).
    pub unit_query: Vec<f64>,
    /// Le plus bas des deux seuils du calibrage : en dessous, un extrait ne compte que par ses termes exacts.
    pub floor: f64,
    /// Extraits dont le cosinus est demandé quel qu'il soit (ceux qui portent les termes exacts de la question).
    #[serde(default)]
    pub extra_rows: Vec<i64>,
}

#[derive(Deserialize, Serialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct VectorReply {
    pub rows: Vec<i64>,
    pub cosines: Vec<f64>,
    /// Extraits gardés en mémoire pour ce modèle.
    pub indexed: usize,
    /// Vrai quand l'index a dû être (re)lu depuis SQLite pour cet appel.
    pub loaded: bool,
    pub load_ms: f64,
    pub search_ms: f64,
}

struct Loaded {
    model_key: String,
    signature: (i64, i64),
    rowids: Vec<i64>,
    /// Les vecteurs bout à bout, DIMENSIONS valeurs par extrait, dans l'ordre de `rowids`.
    vectors: Vec<f32>,
}

/// L'index partagé par la commande locale et par le poste principal quand il sert les postes clients.
#[derive(Default)]
pub struct VectorIndex {
    loaded: Mutex<Option<Loaded>>,
}

#[derive(Default, Clone)]
pub struct VectorState(pub Arc<VectorIndex>);

/// Le vecteur stocké (768 float32 little-endian), avec les refus de embeddingBytesFromHex côté TypeScript :
/// mauvaise longueur, valeur non finie, vecteur nul.
pub fn decode_vector(bytes: &[u8]) -> Option<[f32; DIMENSIONS]> {
    if bytes.len() != VECTOR_BYTES {
        return None;
    }
    let mut vector = [0f32; DIMENSIONS];
    let mut squares = 0f64;
    for (index, chunk) in bytes.chunks_exact(4).enumerate() {
        let value = f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
        if !value.is_finite() {
            return None;
        }
        squares += f64::from(value) * f64::from(value);
        vector[index] = value;
    }
    (squares > 0.0).then_some(vector)
}

/// Le cosinus de passageCosine (TypeScript), opération pour opération : produit scalaire et somme des carrés en
/// double précision, dans le même ordre, puis division par la racine. Mêmes nombres, même résultat.
pub fn cosine(vector: &[f32], unit_query: &[f64]) -> f64 {
    let mut dot = 0f64;
    let mut squares = 0f64;
    for (value, query) in vector.iter().zip(unit_query) {
        let value = f64::from(*value);
        dot += value * query;
        squares += value * value;
    }
    dot / squares.sqrt()
}

async fn signature(connection: &mut SqliteConnection, model_key: &str) -> Result<(i64, i64), String> {
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM embeddings WHERE model_key = ?")
        .bind(model_key)
        .fetch_one(&mut *connection)
        .await
        .map_err(|e| e.to_string())?;
    let generation: i64 = sqlx::query_scalar("SELECT generation FROM search_index_state WHERE id = 1")
        .fetch_one(&mut *connection)
        .await
        .map_err(|e| e.to_string())?;
    Ok((count, generation))
}

async fn load(connection: &mut SqliteConnection, model_key: &str, signature: (i64, i64)) -> Result<Loaded, String> {
    let mut rowids = Vec::with_capacity(usize::try_from(signature.0).unwrap_or(0));
    let mut vectors = Vec::with_capacity(rowids.capacity() * DIMENSIONS);
    let mut after = i64::MIN;
    loop {
        let page = sqlx::query("SELECT rowid, embedding FROM embeddings WHERE model_key = ? AND rowid > ? ORDER BY rowid LIMIT ?")
            .bind(model_key)
            .bind(after)
            .bind(LOAD_PAGE)
            .fetch_all(&mut *connection)
            .await
            .map_err(|e| e.to_string())?;
        for row in &page {
            let rowid: i64 = row.try_get(0).map_err(|e| e.to_string())?;
            after = rowid;
            let bytes: Vec<u8> = row.try_get(1).map_err(|e| e.to_string())?;
            if let Some(vector) = decode_vector(&bytes) {
                rowids.push(rowid);
                vectors.extend_from_slice(&vector);
            }
        }
        if (page.len() as i64) < LOAD_PAGE {
            break;
        }
    }
    rowids.shrink_to_fit();
    vectors.shrink_to_fit();
    Ok(Loaded { model_key: model_key.to_string(), signature, rowids, vectors })
}

impl VectorIndex {
    /// Cherche avec la connexion donnée : celle du greffon SQL sur ce poste, ou celle d'une session cliente sur le
    /// poste principal.
    pub async fn search(&self, connection: &mut SqliteConnection, query: &VectorQuery) -> Result<VectorReply, String> {
        if query.unit_query.len() != DIMENSIONS || query.unit_query.iter().any(|v| !v.is_finite()) {
            return Err("La question n'a pas la taille attendue.".into());
        }
        let mut reply = VectorReply::default();
        let mut loaded = self.loaded.lock().await;
        let current = signature(connection, &query.model_key).await?;
        let stale = loaded
            .as_ref()
            .is_none_or(|index| index.model_key != query.model_key || index.signature != current);
        if stale {
            let started = Instant::now();
            // L'ancien index est rendu avant de lire le nouveau : la mémoire ne tient jamais les deux.
            *loaded = None;
            *loaded = Some(load(connection, &query.model_key, current).await?);
            reply.loaded = true;
            reply.load_ms = started.elapsed().as_secs_f64() * 1000.0;
        }
        let index = loaded.as_ref().expect("index chargé ci-dessus");
        let started = Instant::now();
        let extra: std::collections::HashSet<i64> = query.extra_rows.iter().copied().collect();
        for (position, rowid) in index.rowids.iter().enumerate() {
            let vector = &index.vectors[position * DIMENSIONS..(position + 1) * DIMENSIONS];
            let value = cosine(vector, &query.unit_query);
            if value >= query.floor || extra.contains(rowid) {
                reply.rows.push(*rowid);
                reply.cosines.push(value);
            }
        }
        reply.indexed = index.rowids.len();
        reply.search_ms = started.elapsed().as_secs_f64() * 1000.0;
        Ok(reply)
    }
}

/// La commande appelée par la page. Derrière l'interrupteur côté TypeScript ; une erreur fait retomber la page sur
/// la recherche TypeScript.
#[tauri::command]
pub async fn recherche_vecteurs(
    app: AppHandle,
    state: State<'_, VectorState>,
    network: State<'_, crate::clinic_network::ClinicNetwork>,
    query: VectorQuery,
) -> Result<VectorReply, String> {
    if network.is_client() {
        return crate::clinic_network::remote_vectors(&network, query).await;
    }
    let pool = {
        let instances = app.state::<DbInstances>();
        let databases = instances.0.read().await;
        match databases.get("sqlite:baitari.db") {
            Some(DbPool::Sqlite(pool)) => pool.clone(),
            _ => return Err("La base de la clinique n'est pas ouverte.".into()),
        }
    };
    let mut connection = pool.acquire().await.map_err(|e| e.to_string())?;
    state.0.search(&mut connection, &query).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::{Connection, Executor};

    fn bytes(vector: &[f32]) -> Vec<u8> {
        vector.iter().flat_map(|v| v.to_le_bytes()).collect()
    }

    fn unit(vector: &[f64]) -> Vec<f64> {
        let norm = vector.iter().map(|v| v * v).sum::<f64>().sqrt();
        vector.iter().map(|v| v / norm).collect()
    }

    #[test]
    fn decodes_and_refuses_like_the_typescript_side() {
        let vector: Vec<f32> = (0..DIMENSIONS).map(|i| (i as f32).sin()).collect();
        assert_eq!(decode_vector(&bytes(&vector)).unwrap().to_vec(), vector);
        assert!(decode_vector(&[0u8; 12]).is_none());
        assert!(decode_vector(&vec![0u8; VECTOR_BYTES]).is_none());
        assert!(decode_vector(&bytes(&vec![f32::NAN; DIMENSIONS])).is_none());
    }

    #[test]
    fn cosine_is_dot_over_norm_in_double_precision() {
        let vector: Vec<f32> = (0..DIMENSIONS).map(|i| ((i * 7) as f32).cos()).collect();
        let query = unit(&(0..DIMENSIONS).map(|i| (i as f64).sin()).collect::<Vec<_>>());
        let mut dot = 0f64;
        let mut squares = 0f64;
        for (v, q) in vector.iter().zip(&query) {
            dot += f64::from(*v) * q;
            squares += f64::from(*v) * f64::from(*v);
        }
        assert_eq!(cosine(&vector, &query), dot / squares.sqrt());
        assert!((cosine(&vector, &query) - cosine(&vector.iter().map(|v| v * 3.0).collect::<Vec<_>>(), &query)).abs() < 1e-6);
    }

    async fn database() -> SqliteConnection {
        let mut connection = SqliteConnection::connect(":memory:").await.unwrap();
        connection
            .execute(
                "CREATE TABLE embeddings (id TEXT PRIMARY KEY, model_key TEXT NOT NULL, embedding BLOB NOT NULL);
                 CREATE TABLE search_index_state (id INTEGER PRIMARY KEY, generation INTEGER NOT NULL DEFAULT 0);
                 INSERT INTO search_index_state (id, generation) VALUES (1, 0);
                 CREATE TRIGGER g_insert AFTER INSERT ON embeddings BEGIN UPDATE search_index_state SET generation = generation + 1 WHERE id = 1; END;
                 CREATE TRIGGER g_delete AFTER DELETE ON embeddings BEGIN UPDATE search_index_state SET generation = generation + 1 WHERE id = 1; END;",
            )
            .await
            .unwrap();
        connection
    }

    async fn insert(connection: &mut SqliteConnection, id: &str, model: &str, vector: &[f32]) {
        sqlx::query("INSERT INTO embeddings (id, model_key, embedding) VALUES (?, ?, ?)")
            .bind(id)
            .bind(model)
            .bind(bytes(vector))
            .execute(&mut *connection)
            .await
            .unwrap();
    }

    fn axis(i: usize) -> Vec<f32> {
        (0..DIMENSIONS).map(|j| if j == i { 1.0 } else { 0.0 }).collect()
    }

    #[test]
    fn returns_rows_above_the_floor_and_the_extra_rows_only() {
        tauri::async_runtime::block_on(async {
            let mut connection = database().await;
            for i in 0..5 {
                insert(&mut connection, &format!("e{i}"), "m", &axis(i)).await;
            }
            insert(&mut connection, "other", "n", &axis(0)).await;
            let index = VectorIndex::default();
            let query = VectorQuery { model_key: "m".into(), unit_query: axis(0).iter().map(|v| f64::from(*v)).collect(), floor: 0.5, extra_rows: vec![4] };
            let reply = index.search(&mut connection, &query).await.unwrap();
            assert_eq!(reply.indexed, 5);
            assert_eq!(reply.rows, vec![1, 4]);
            assert_eq!(reply.cosines, vec![1.0, 0.0]);
            assert!(reply.loaded);
            assert!(!index.search(&mut connection, &query).await.unwrap().loaded);
        });
    }

    #[test]
    fn reloads_when_a_passage_is_replaced_under_the_same_rowid() {
        tauri::async_runtime::block_on(async {
            let mut connection = database().await;
            insert(&mut connection, "a", "m", &axis(0)).await;
            insert(&mut connection, "b", "m", &axis(1)).await;
            let index = VectorIndex::default();
            let query = VectorQuery { model_key: "m".into(), unit_query: axis(1).iter().map(|v| f64::from(*v)).collect(), floor: 0.5, extra_rows: vec![] };
            assert_eq!(index.search(&mut connection, &query).await.unwrap().rows, vec![2]);
            // Re-indexing the latest passage: deleted then inserted again, it gets the same rowid back and the count
            // does not move. Only the generation counter tells the index it is stale.
            connection.execute("DELETE FROM embeddings WHERE id = 'b'").await.unwrap();
            insert(&mut connection, "b", "m", &axis(2)).await;
            let reply = index.search(&mut connection, &query).await.unwrap();
            assert!(reply.loaded);
            assert!(reply.rows.is_empty());
        });
    }

    #[test]
    fn refuses_a_question_of_the_wrong_size() {
        tauri::async_runtime::block_on(async {
            let mut connection = database().await;
            let index = VectorIndex::default();
            let query = VectorQuery { model_key: "m".into(), unit_query: vec![1.0; 3], floor: 0.0, extra_rows: vec![] };
            assert!(index.search(&mut connection, &query).await.is_err());
        });
    }
}

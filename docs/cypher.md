# Cypher — Le langage de requêtes de Neo4j

Cypher est à Neo4j ce que SQL est à PostgreSQL : son langage de requêtes natif.
Sa particularité : la syntaxe **dessine** le motif de graphe recherché.

---

## 1. Les briques de base

### 1.1 Trois symboles à retenir

| Symbole              | Signification               |
| -------------------- | --------------------------- |
| `()`                 | un **nœud**                 |
| `[]`                 | une **relation**            |
| `-->` ou `-[:TYPE]->`| le **sens** de la relation  |

### 1.2 Anatomie d'un nœud

```cypher
(variable:Label {propriété: valeur})
```

Exemples :

```cypher
()                                  // nœud anonyme
(m)                                 // nœud avec variable m
(:Movie)                            // nœud de label Movie
(m:Movie)                           // les deux
(m:Movie {title: 'Inception'})      // avec filtre par propriété
```

### 1.3 Anatomie d'une relation

```cypher
-[variable:TYPE {propriété: valeur}]->
```

Exemples :

```cypher
-->                                 // relation anonyme
-[:RATED]->                         // type RATED
-[r:RATED]->                        // avec variable r
-[r:RATED {score: 5}]->             // avec filtre
<-[:RATED]-                         // sens inverse
-[:RATED]-                          // sans direction
```

### 1.4 Convention de nommage

| Élément         | Convention      | Exemple        |
| --------------- | --------------- | -------------- |
| Label de nœud   | PascalCase      | `Movie`, `User`|
| Type de relation| MAJUSCULES_SNAKE| `RATED`, `BELONGS_TO` |
| Propriété       | camelCase       | `releaseYear`  |
| Variable        | camelCase       | `m`, `user`    |

---

## 2. Les mots-clés essentiels

| Mot-clé   | Rôle                                       | Équivalent SQL          |
| --------- | ------------------------------------------ | ----------------------- |
| `MATCH`   | trouver un motif existant                  | `SELECT ... FROM`       |
| `WHERE`   | filtrer                                    | `WHERE`                 |
| `RETURN`  | renvoyer un résultat                       | `SELECT`                |
| `CREATE`  | créer (toujours, même doublons)            | `INSERT`                |
| `MERGE`   | créer si absent, sinon match               | `INSERT ... ON CONFLICT`|
| `SET`     | ajouter / modifier des propriétés          | `UPDATE`                |
| `REMOVE`  | retirer une propriété ou un label          | —                       |
| `DELETE`  | supprimer (nœud, relation)                 | `DELETE`                |
| `DETACH DELETE` | supprimer un nœud + ses relations    | `DELETE` + `CASCADE`    |
| `WITH`    | enchaîner des étapes (pipeline)            | sous-requête / CTE      |
| `UNWIND`  | déplier une liste en lignes                | `UNNEST`                |
| `OPTIONAL MATCH` | match qui peut renvoyer null        | `LEFT JOIN`             |

---

## 3. Lire des données — `MATCH`

### 3.1 Lecture simple

```cypher
MATCH (m:Movie)
RETURN m;
```

### 3.2 Filtrage par propriété

```cypher
// dans le motif (rapide, indexé)
MATCH (m:Movie {releaseYear: 2010})
RETURN m;

// avec WHERE (plus expressif)
MATCH (m:Movie)
WHERE m.releaseYear > 2010 AND m.duration < 150
RETURN m.title, m.releaseYear;
```

### 3.3 Filtrage avancé

```cypher
WHERE m.title STARTS WITH 'The'
WHERE m.title ENDS WITH 'father'
WHERE m.title CONTAINS 'God'
WHERE m.title =~ '(?i).*god.*'        // regex
WHERE m.releaseYear IN [2010, 2014]
WHERE m.posterUrl IS NULL
WHERE EXISTS { (m)-[:DIRECTED_BY]->(:Director {name: 'Nolan'}) }
```

### 3.4 Suivre des relations

```cypher
// films notés par alice
MATCH (u:User {username: 'alice'})-[:RATED]->(m:Movie)
RETURN m.title;

// films + score
MATCH (u:User {username: 'alice'})-[r:RATED]->(m:Movie)
RETURN m.title, r.score
ORDER BY r.score DESC;
```

### 3.5 Chemins de longueur variable

C'est **la** raison d'être de Neo4j.

```cypher
// amis directs (1 saut)
MATCH (alice:User {username: 'alice'})-[:FOLLOWS]->(friend)
RETURN friend.username;

// amis d'amis exactement à 2 sauts
MATCH (alice:User {username: 'alice'})-[:FOLLOWS*2]->(foaf)
RETURN foaf.username;

// entre 1 et 3 sauts
MATCH (alice:User {username: 'alice'})-[:FOLLOWS*1..3]->(reach)
RETURN reach.username;

// chemin le plus court
MATCH p = shortestPath(
  (a:User {username: 'alice'})-[:FOLLOWS*]-(b:User {username: 'bob'})
)
RETURN p;
```

### 3.6 OPTIONAL MATCH

Comme `LEFT JOIN` : la requête réussit même si le motif optionnel est absent.

```cypher
MATCH (m:Movie)
OPTIONAL MATCH (m)-[:DIRECTED_BY]->(d:Director)
RETURN m.title, d.name;   // d.name peut être null
```

---

## 4. Créer des données

### 4.1 `CREATE` — création brute

Crée toujours un nouveau nœud, même s'il existe déjà.

```cypher
CREATE (m:Movie {id: 'm99', title: 'Tenet', releaseYear: 2020})
RETURN m;

// création d'un nœud + relation + nœud en une fois
CREATE (u:User {username: 'dave'})-[:RATED {score: 4}]->(m:Movie {id: 'm1'});
```

⚠ Risque de doublons. À éviter dans les scripts d'init.

### 4.2 `MERGE` — idempotent

Cherche le motif. S'il existe → match. Sinon → crée.

```cypher
MERGE (g:Genre {name: 'Sci-Fi'});

// pour une relation : matcher d'abord les nœuds
MATCH (u:User {id: 'u1'}), (m:Movie {id: 'm1'})
MERGE (u)-[:RATED {score: 5}]->(m);
```

#### `ON CREATE` / `ON MATCH`

Comportement différent selon que le nœud vient d'être créé ou qu'il existait déjà.

```cypher
MERGE (u:User {email: 'alice@neo4flix.io'})
ON CREATE SET u.createdAt = datetime(), u.loginCount = 0
ON MATCH  SET u.loginCount = u.loginCount + 1, u.lastLogin = datetime();
```

---

## 5. Modifier des données

### 5.1 `SET`

```cypher
MATCH (m:Movie {id: 'm1'})
SET m.duration = 150;

// plusieurs propriétés
SET m.duration = 150, m.posterUrl = 'https://...';

// remplacer toutes les propriétés
SET m = {title: 'Inception', releaseYear: 2010};

// fusionner sans écraser les autres
SET m += {posterUrl: 'https://...'};

// ajouter un label
SET m:Classic;
```

### 5.2 `REMOVE`

```cypher
MATCH (m:Movie {id: 'm1'})
REMOVE m.posterUrl;       // retire la propriété
REMOVE m:Classic;         // retire le label
```

---

## 6. Supprimer des données

```cypher
// supprimer une relation
MATCH (u:User {id: 'u1'})-[r:WATCHLIST]->(m:Movie {id: 'm4'})
DELETE r;

// supprimer un nœud — ÉCHOUE s'il a des relations
MATCH (m:Movie {id: 'm99'})
DELETE m;

// supprimer un nœud ET ses relations
MATCH (m:Movie {id: 'm99'})
DETACH DELETE m;

// nettoyer toute la base (ATTENTION)
MATCH (n) DETACH DELETE n;
```

---

## 7. Agrégation et tri

```cypher
// note moyenne par film
MATCH (:User)-[r:RATED]->(m:Movie)
RETURN m.title, avg(r.score) AS avgScore, count(r) AS nbRatings
ORDER BY avgScore DESC
LIMIT 10;
```

| Fonction      | Rôle                          |
| ------------- | ----------------------------- |
| `count(x)`    | compter                       |
| `sum(x)`      | somme                         |
| `avg(x)`      | moyenne                       |
| `min(x)`/`max(x)` | min / max                 |
| `collect(x)`  | regrouper en liste            |

`collect` est précieux pour reconstruire des objets imbriqués :

```cypher
MATCH (m:Movie)-[:BELONGS_TO]->(g:Genre)
RETURN m.title, collect(g.name) AS genres;
// → "Inception", ["Sci-Fi", "Action"]
```

---

## 8. `WITH` — enchaîner des étapes

`WITH` est le **pipeline** de Cypher. Il passe le résultat d'une étape à la suivante, en permettant filtre / agrégation entre les deux.

```cypher
// top 3 des genres préférés d'alice
MATCH (u:User {username: 'alice'})-[r:RATED]->(:Movie)-[:BELONGS_TO]->(g:Genre)
WITH g, avg(r.score) AS avgScore, count(*) AS nb
WHERE nb >= 1
RETURN g.name, avgScore
ORDER BY avgScore DESC
LIMIT 3;
```

---

## 9. `UNWIND` — déplier une liste

Très utile pour insérer en lot.

```cypher
UNWIND [
  {id: 'm10', title: 'Tenet',     year: 2020},
  {id: 'm11', title: 'Oppenheimer', year: 2023}
] AS row
MERGE (m:Movie {id: row.id})
SET m.title = row.title, m.releaseYear = row.year;
```

---

## 10. Schéma — contraintes et index

### Contraintes (créent automatiquement un index)

```cypher
CREATE CONSTRAINT user_email_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.email IS UNIQUE;

// existence requise (Enterprise uniquement)
CREATE CONSTRAINT movie_title_exists IF NOT EXISTS
FOR (m:Movie) REQUIRE m.title IS NOT NULL;
```

### Index secondaires

```cypher
CREATE INDEX movie_title_index IF NOT EXISTS
FOR (m:Movie) ON (m.title);

// composite
CREATE INDEX movie_year_duration IF NOT EXISTS
FOR (m:Movie) ON (m.releaseYear, m.duration);

// fulltext (recherche par texte)
CREATE FULLTEXT INDEX movie_search IF NOT EXISTS
FOR (m:Movie) ON EACH [m.title, m.description];
```

### Lister / supprimer

```cypher
SHOW CONSTRAINTS;
SHOW INDEXES;
DROP CONSTRAINT user_email_unique;
DROP INDEX movie_title_index;
```

---

## 11. Patterns typiques pour Neo4flix

### Films notés par un user

```cypher
MATCH (u:User {id: $userId})-[r:RATED]->(m:Movie)
RETURN m, r.score;
```

### Note moyenne d'un film

```cypher
MATCH (m:Movie {id: $movieId})<-[r:RATED]-(:User)
RETURN avg(r.score) AS avg, count(r) AS nb;
```

### Recommandation par genre préféré

```cypher
MATCH (u:User {id: $userId})-[r:RATED]->(:Movie)-[:BELONGS_TO]->(g:Genre)
WITH u, g, avg(r.score) AS pref
ORDER BY pref DESC
LIMIT 3
MATCH (g)<-[:BELONGS_TO]-(reco:Movie)
WHERE NOT (u)-[:RATED]->(reco)
RETURN reco.title, collect(DISTINCT g.name) AS matchingGenres
LIMIT 10;
```

### Recommandation collaborative

> "Les gens qui notent comme moi aiment quoi ?"

```cypher
MATCH (me:User {id: $userId})-[r1:RATED]->(m:Movie)<-[r2:RATED]-(other:User)
WHERE me <> other AND abs(r1.score - r2.score) <= 1
WITH other, count(*) AS similarity
ORDER BY similarity DESC
LIMIT 20
MATCH (other)-[r:RATED]->(reco:Movie)
WHERE NOT EXISTS { (:User {id: $userId})-[:RATED]->(reco) }
  AND r.score >= 4
RETURN reco.title, avg(r.score) AS score, count(*) AS hits
ORDER BY score DESC, hits DESC
LIMIT 10;
```

### Films d'un acteur donné

```cypher
MATCH (a:Actor {name: 'Leonardo DiCaprio'})<-[role:HAS_ACTOR]-(m:Movie)
RETURN m.title, m.releaseYear, role.role
ORDER BY m.releaseYear DESC;
```

### Watchlist d'un user

```cypher
MATCH (u:User {id: $userId})-[w:WATCHLIST]->(m:Movie)
RETURN m, w.addedAt
ORDER BY w.addedAt DESC;
```

---

## 12. Paramètres `$param`

Toujours **paramétrer** les requêtes — jamais concaténer (sécurité + perf).

```cypher
MATCH (m:Movie {id: $movieId})
RETURN m;
```

Côté driver :

```js
session.run("MATCH (m:Movie {id: $movieId}) RETURN m", { movieId: 'm1' });
```

Spring Data Neo4j fait ça automatiquement à partir des arguments de méthode.

---

## 13. Performance — ce qu'il faut savoir

1. **Toujours partir d'un nœud indexé** (label + propriété unique).
2. **Filtrer tôt** dans le motif, pas à la fin.
3. **`PROFILE`** devant la requête → plan d'exécution + coût.
4. **`EXPLAIN`** → plan d'exécution sans exécuter.
5. **`LIMIT`** côté serveur, pas côté client.
6. Les relations sont **stockées sur les nœuds** : un parcours de relations est O(1) par saut, pas O(n).

```cypher
PROFILE
MATCH (u:User {username: 'alice'})-[:RATED]->(m:Movie)
RETURN m.title;
```

---

## 14. Erreurs fréquentes

| Erreur                                       | Cause                                | Fix                              |
| -------------------------------------------- | ------------------------------------ | -------------------------------- |
| `Cannot delete node, has relationships`      | `DELETE` sur un nœud lié             | `DETACH DELETE`                  |
| Doublons après plusieurs runs                | `CREATE` au lieu de `MERGE`          | utiliser `MERGE`                 |
| Requête lente                                | pas d'index sur la propriété de départ | `CREATE INDEX`                |
| `MERGE` crée deux fois la même relation      | propriété ajoutée dans le `MERGE` qui change à chaque fois (`datetime()`) | mettre la propriété variable dans `ON CREATE SET` |
| `null` partout                               | `OPTIONAL MATCH` sans données        | normal — utiliser `coalesce`     |

---

## 15. Cheatsheet ultra-condensée

```cypher
// LIRE
MATCH (n:Label {prop: val}) WHERE ... RETURN n ORDER BY ... LIMIT n;

// CRÉER
CREATE (n:Label {prop: val});
MERGE  (n:Label {prop: val});               // idempotent

// RELATION
MATCH (a {...}), (b {...})
MERGE (a)-[:TYPE {prop: val}]->(b);

// MAJ
MATCH (n {...}) SET n.prop = val;

// SUPPRIMER
MATCH (n {...}) DETACH DELETE n;

// AGRÉGER
MATCH ... RETURN x, count(*), avg(y), collect(z);

// PIPELINE
MATCH ... WITH ... WHERE ... RETURN ...;

// PARAMÈTRES
MATCH (n {id: $id}) RETURN n;
```

---

## 16. Pour aller plus loin

- Manuel officiel : https://neo4j.com/docs/cypher-manual/current/
- GraphAcademy (gratuit) : https://graphacademy.neo4j.com/
- Neo4j Browser : `:play movies` charge un tutoriel intégré.

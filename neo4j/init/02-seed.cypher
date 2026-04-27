// ============================================================
// Données de démo — Neo4flix
// À jouer APRÈS 01-constraints.cypher
// ============================================================

// --- Genres ---
MERGE (:Genre {name: 'Sci-Fi'});
MERGE (:Genre {name: 'Drama'});
MERGE (:Genre {name: 'Action'});
MERGE (:Genre {name: 'Thriller'});
MERGE (:Genre {name: 'Crime'});
MERGE (:Genre {name: 'Adventure'});

// --- Réalisateurs ---
MERGE (:Director {id: 'd1', name: 'Christopher Nolan',   birthYear: 1970});
MERGE (:Director {id: 'd2', name: 'Denis Villeneuve',    birthYear: 1967});
MERGE (:Director {id: 'd3', name: 'Quentin Tarantino',   birthYear: 1963});
MERGE (:Director {id: 'd4', name: 'Francis Ford Coppola', birthYear: 1939});

// --- Acteurs ---
MERGE (:Actor {id: 'a1', name: 'Leonardo DiCaprio',  birthYear: 1974});
MERGE (:Actor {id: 'a2', name: 'Marion Cotillard',   birthYear: 1975});
MERGE (:Actor {id: 'a3', name: 'Timothée Chalamet',  birthYear: 1995});
MERGE (:Actor {id: 'a4', name: 'Zendaya',            birthYear: 1996});
MERGE (:Actor {id: 'a5', name: 'Uma Thurman',        birthYear: 1970});
MERGE (:Actor {id: 'a6', name: 'John Travolta',      birthYear: 1954});
MERGE (:Actor {id: 'a7', name: 'Al Pacino',          birthYear: 1940});
MERGE (:Actor {id: 'a8', name: 'Marlon Brando',      birthYear: 1924});

// --- Films ---
MERGE (:Movie {id: 'm1', title: 'Inception',     releaseYear: 2010, duration: 148, posterUrl: '', description: 'Un voleur s\'introduit dans les rêves.'});
MERGE (:Movie {id: 'm2', title: 'Interstellar',  releaseYear: 2014, duration: 169, posterUrl: '', description: 'Voyage interstellaire pour sauver l\'humanité.'});
MERGE (:Movie {id: 'm3', title: 'Dune',          releaseYear: 2021, duration: 155, posterUrl: '', description: 'Adaptation du roman de Frank Herbert.'});
MERGE (:Movie {id: 'm4', title: 'Pulp Fiction',  releaseYear: 1994, duration: 154, posterUrl: '', description: 'Histoires entrelacées dans le LA criminel.'});
MERGE (:Movie {id: 'm5', title: 'The Godfather', releaseYear: 1972, duration: 175, posterUrl: '', description: 'Saga de la famille Corleone.'});

// --- Liens films ↔ genres ---
MATCH (m:Movie {id: 'm1'}), (g:Genre {name: 'Sci-Fi'})    MERGE (m)-[:BELONGS_TO]->(g);
MATCH (m:Movie {id: 'm1'}), (g:Genre {name: 'Action'})    MERGE (m)-[:BELONGS_TO]->(g);
MATCH (m:Movie {id: 'm2'}), (g:Genre {name: 'Sci-Fi'})    MERGE (m)-[:BELONGS_TO]->(g);
MATCH (m:Movie {id: 'm2'}), (g:Genre {name: 'Drama'})     MERGE (m)-[:BELONGS_TO]->(g);
MATCH (m:Movie {id: 'm3'}), (g:Genre {name: 'Sci-Fi'})    MERGE (m)-[:BELONGS_TO]->(g);
MATCH (m:Movie {id: 'm3'}), (g:Genre {name: 'Adventure'}) MERGE (m)-[:BELONGS_TO]->(g);
MATCH (m:Movie {id: 'm4'}), (g:Genre {name: 'Crime'})     MERGE (m)-[:BELONGS_TO]->(g);
MATCH (m:Movie {id: 'm4'}), (g:Genre {name: 'Drama'})     MERGE (m)-[:BELONGS_TO]->(g);
MATCH (m:Movie {id: 'm5'}), (g:Genre {name: 'Crime'})     MERGE (m)-[:BELONGS_TO]->(g);
MATCH (m:Movie {id: 'm5'}), (g:Genre {name: 'Drama'})     MERGE (m)-[:BELONGS_TO]->(g);

// --- Liens films ↔ réalisateurs ---
MATCH (m:Movie {id: 'm1'}), (d:Director {id: 'd1'}) MERGE (m)-[:DIRECTED_BY]->(d);
MATCH (m:Movie {id: 'm2'}), (d:Director {id: 'd1'}) MERGE (m)-[:DIRECTED_BY]->(d);
MATCH (m:Movie {id: 'm3'}), (d:Director {id: 'd2'}) MERGE (m)-[:DIRECTED_BY]->(d);
MATCH (m:Movie {id: 'm4'}), (d:Director {id: 'd3'}) MERGE (m)-[:DIRECTED_BY]->(d);
MATCH (m:Movie {id: 'm5'}), (d:Director {id: 'd4'}) MERGE (m)-[:DIRECTED_BY]->(d);

// --- Liens films ↔ acteurs (avec rôle) ---
MATCH (m:Movie {id: 'm1'}), (a:Actor {id: 'a1'}) MERGE (m)-[:HAS_ACTOR {role: 'Cobb'}]->(a);
MATCH (m:Movie {id: 'm1'}), (a:Actor {id: 'a2'}) MERGE (m)-[:HAS_ACTOR {role: 'Mal'}]->(a);
MATCH (m:Movie {id: 'm3'}), (a:Actor {id: 'a3'}) MERGE (m)-[:HAS_ACTOR {role: 'Paul Atreides'}]->(a);
MATCH (m:Movie {id: 'm3'}), (a:Actor {id: 'a4'}) MERGE (m)-[:HAS_ACTOR {role: 'Chani'}]->(a);
MATCH (m:Movie {id: 'm4'}), (a:Actor {id: 'a5'}) MERGE (m)-[:HAS_ACTOR {role: 'Mia Wallace'}]->(a);
MATCH (m:Movie {id: 'm4'}), (a:Actor {id: 'a6'}) MERGE (m)-[:HAS_ACTOR {role: 'Vincent Vega'}]->(a);
MATCH (m:Movie {id: 'm5'}), (a:Actor {id: 'a7'}) MERGE (m)-[:HAS_ACTOR {role: 'Michael Corleone'}]->(a);
MATCH (m:Movie {id: 'm5'}), (a:Actor {id: 'a8'}) MERGE (m)-[:HAS_ACTOR {role: 'Vito Corleone'}]->(a);

// --- Utilisateurs de démo (passwordHash = bcrypt à remplacer plus tard) ---
MERGE (:User {id: 'u1', username: 'alice', email: 'alice@neo4flix.io', passwordHash: 'PLACEHOLDER', createdAt: datetime()});
MERGE (:User {id: 'u2', username: 'bob',   email: 'bob@neo4flix.io',   passwordHash: 'PLACEHOLDER', createdAt: datetime()});
MERGE (:User {id: 'u3', username: 'carol', email: 'carol@neo4flix.io', passwordHash: 'PLACEHOLDER', createdAt: datetime()});

// --- Notes ---
MATCH (u:User {id: 'u1'}), (m:Movie {id: 'm1'}) MERGE (u)-[:RATED {score: 5, ratedAt: datetime()}]->(m);
MATCH (u:User {id: 'u1'}), (m:Movie {id: 'm2'}) MERGE (u)-[:RATED {score: 5, ratedAt: datetime()}]->(m);
MATCH (u:User {id: 'u1'}), (m:Movie {id: 'm3'}) MERGE (u)-[:RATED {score: 4, ratedAt: datetime()}]->(m);
MATCH (u:User {id: 'u2'}), (m:Movie {id: 'm4'}) MERGE (u)-[:RATED {score: 5, ratedAt: datetime()}]->(m);
MATCH (u:User {id: 'u2'}), (m:Movie {id: 'm5'}) MERGE (u)-[:RATED {score: 5, ratedAt: datetime()}]->(m);
MATCH (u:User {id: 'u3'}), (m:Movie {id: 'm1'}) MERGE (u)-[:RATED {score: 4, ratedAt: datetime()}]->(m);
MATCH (u:User {id: 'u3'}), (m:Movie {id: 'm4'}) MERGE (u)-[:RATED {score: 4, ratedAt: datetime()}]->(m);

// --- Watchlist ---
MATCH (u:User {id: 'u1'}), (m:Movie {id: 'm4'}) MERGE (u)-[:WATCHLIST {addedAt: datetime()}]->(m);
MATCH (u:User {id: 'u2'}), (m:Movie {id: 'm2'}) MERGE (u)-[:WATCHLIST {addedAt: datetime()}]->(m);

// --- Follows ---
MATCH (u1:User {id: 'u1'}), (u2:User {id: 'u2'}) MERGE (u1)-[:FOLLOWS {since: datetime()}]->(u2);
MATCH (u1:User {id: 'u3'}), (u2:User {id: 'u1'}) MERGE (u1)-[:FOLLOWS {since: datetime()}]->(u2);
